import logging
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Depends

from ..models.schemas import (
    Complaint,
    ComplaintCreate,
    StatusUpdate,
    ResolveComplaintRequest,
    ReopenComplaintRequest,
    StatusHistoryItem,
)
from ..services.store import data_store
from ..auth import require_authority, verify_token
from ..config import UPLOAD_DIR, STORAGE_BUCKET

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


@router.get("", response_model=List[Complaint])
def get_complaints(
    problem_type: Optional[str] = Query(None, description="Filter by problem type (pothole, garbage, etc.)"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    status: Optional[str] = Query(None, description="Filter by complaint lifecycle status"),
    department: Optional[str] = Query(None, description="Filter by department name substring"),
    resolution_status: Optional[str] = Query(None, description="Filter by resolution status"),
    limit: Optional[int] = Query(None, description="Limit number of returned records"),
):
    """Retrieve filtered civic complaint records for authority triage."""
    return data_store.list_complaints(
        problem_type=problem_type,
        severity=severity,
        status=status,
        department=department,
        resolution_status=resolution_status,
        limit=limit,
    )


@router.post("/upload-resolution-evidence")
async def upload_resolution_evidence(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_authority),
):
    """Authority uploads photograph evidence demonstrating civic defect resolution."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Allowed formats: JPG, PNG, WEBP.",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the 10 MB limit.",
        )

    unique_filename = f"resolution_{uuid.uuid4().hex[:12]}{ext}"
    local_target = Path(UPLOAD_DIR) / unique_filename
    try:
        local_target.parent.mkdir(parents=True, exist_ok=True)
        with open(local_target, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.warning(f"Could not write resolution image locally: {e}")

    # Also upload to Supabase storage private bucket
    client = data_store._get_supabase_client()
    if client:
        try:
            content_type = file.content_type or "image/jpeg"
            client.storage.from_(STORAGE_BUCKET).upload(
                path=unique_filename,
                file=content,
                file_options={"content-type": content_type}
            )
            logger.info(f"Uploaded {unique_filename} to Supabase storage '{STORAGE_BUCKET}'")
        except Exception as se:
            logger.warning(f"Could not upload resolution image to Supabase: {se}")

    return {
        "image_url": f"/api/complaints/image/{unique_filename}",
        "filename": unique_filename,
    }


@router.get("/{complaint_id}", response_model=Complaint)
def get_complaint(complaint_id: str):
    """Inspect deep detail of a specific civic complaint by ID or Report ID."""
    complaint = data_store.get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return complaint


@router.post("/{complaint_id}/resolve", response_model=Complaint)
def resolve_complaint(
    complaint_id: str,
    payload: ResolveComplaintRequest,
    current_user: dict = Depends(require_authority),
):
    """Mark a civic complaint as RESOLVED with resolution image evidence and notes."""
    if not payload.resolution_image_url:
        raise HTTPException(
            status_code=400,
            detail="Resolution image evidence is required to mark complaint as resolved.",
        )

    complaint = data_store.get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    authority_name = current_user.get("full_name") or current_user.get("email") or "Municipal Authority Officer"
    resolved = data_store.resolve_complaint(
        complaint_id=complaint_id,
        resolution_image_url=payload.resolution_image_url,
        resolution_note=payload.resolution_note,
        resolved_by=authority_name,
    )
    if not resolved:
        raise HTTPException(status_code=500, detail="Failed to resolve complaint.")
    return resolved


@router.patch("/{complaint_id}/status", response_model=Complaint)
def update_complaint_status(
    complaint_id: str,
    payload: StatusUpdate,
    current_user: dict = Depends(require_authority),
):
    """Update lifecycle status of a complaint (REPORTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> REOPENED)."""
    authority_name = current_user.get("full_name") or "Municipal Authority Officer"
    updated = data_store.update_complaint_status(
        complaint_id=complaint_id,
        new_status=payload.status,
        resolution_image_url=payload.resolution_image_url,
        resolution_note=payload.resolution_note,
        resolved_by=authority_name,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return updated


@router.post("/{complaint_id}/confirm-resolution", response_model=Complaint)
def confirm_resolution(
    complaint_id: str,
    current_user: dict = Depends(verify_token),
):
    """Citizen confirms that the civic defect has been successfully rectified."""
    complaint = data_store.get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    if complaint.status != "RESOLVED":
        raise HTTPException(
            status_code=400,
            detail="Only resolved complaints can be confirmed by citizens.",
        )

    user_id = current_user.get("id")
    caller_role = current_user.get("role", "citizen")
    citizen_owner = getattr(complaint, "citizen_id", None)
    if citizen_owner and caller_role != "authority" and citizen_owner != user_id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to confirm this complaint.",
        )

    confirmed = data_store.confirm_resolution(complaint_id)
    if not confirmed:
        raise HTTPException(status_code=500, detail="Failed to confirm resolution.")
    return confirmed


@router.post("/{complaint_id}/reopen", response_model=Complaint)
def reopen_complaint(
    complaint_id: str,
    payload: ReopenComplaintRequest,
    current_user: dict = Depends(verify_token),
):
    """Citizen reports that the issue is still unresolved, reopening the complaint."""
    complaint = data_store.get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    if complaint.status != "RESOLVED":
        raise HTTPException(
            status_code=400,
            detail="Only resolved complaints can be reopened.",
        )

    user_id = current_user.get("id")
    caller_role = current_user.get("role", "citizen")
    citizen_owner = getattr(complaint, "citizen_id", None)
    if citizen_owner and caller_role != "authority" and citizen_owner != user_id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to reopen this complaint.",
        )

    reopened = data_store.reopen_complaint(complaint_id, reason=payload.reason or "")
    if not reopened:
        raise HTTPException(status_code=500, detail="Failed to reopen complaint.")
    return reopened


@router.get("/{complaint_id}/history", response_model=List[StatusHistoryItem])
def get_complaint_history(
    complaint_id: str,
    current_user: dict = Depends(verify_token),
):
    """Retrieve complete auditable lifecycle history for a complaint."""
    complaint = data_store.get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return complaint.status_history or []


@router.post("", response_model=Complaint, status_code=201)
def create_complaint(payload: ComplaintCreate):
    """Register a new citizen civic complaint."""
    return data_store.add_complaint(payload)
