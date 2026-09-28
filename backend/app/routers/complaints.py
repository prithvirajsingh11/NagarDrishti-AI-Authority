from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from ..models.schemas import Complaint, ComplaintCreate, StatusUpdate
from ..services.store import data_store

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


@router.get("", response_model=List[Complaint])
def get_complaints(
    problem_type: Optional[str] = Query(None, description="Filter by problem type (pothole, garbage, etc.)"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    status: Optional[str] = Query(None, description="Filter by complaint lifecycle status"),
    department: Optional[str] = Query(None, description="Filter by department name substring"),
    limit: Optional[int] = Query(None, description="Limit number of returned records"),
):
    """Retrieve filtered civic complaint records for authority triage."""
    return data_store.list_complaints(
        problem_type=problem_type,
        severity=severity,
        status=status,
        department=department,
        limit=limit,
    )


@router.get("/{complaint_id}", response_model=Complaint)
def get_complaint(complaint_id: str):
    """Inspect deep detail of a specific civic complaint by ID or Report ID."""
    complaint = data_store.get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return complaint


@router.patch("/{complaint_id}/status", response_model=Complaint)
def update_complaint_status(complaint_id: str, payload: StatusUpdate):
    """Update lifecycle status of a complaint (REPORTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED)."""
    updated = data_store.update_complaint_status(complaint_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return updated


@router.post("", response_model=Complaint, status_code=201)
def create_complaint(payload: ComplaintCreate):
    """Register a new citizen civic complaint."""
    return data_store.add_complaint(payload)
