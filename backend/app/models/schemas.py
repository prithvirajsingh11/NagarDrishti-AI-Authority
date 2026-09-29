from typing import List, Optional, Literal, Dict
from pydantic import BaseModel, Field

ProblemType = Literal["pothole", "garbage", "streetlight", "drain", "other"]
SeverityLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
ComplaintStatus = Literal["REPORTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REOPENED"]
CitizenVerificationStatus = Literal["PENDING", "CONFIRMED", "REOPENED"]


class StatusHistoryItem(BaseModel):
    status: str
    timestamp: str
    note: Optional[str] = None
    actor: Optional[str] = None
    actor_role: Optional[str] = None


class Department(BaseModel):
    id: str
    name: str
    category: str
    is_active: bool = True


class ComplaintCreate(BaseModel):
    problem_type: ProblemType
    confidence: float = 0.92
    severity: SeverityLevel = "MEDIUM"
    evidence: List[str] = Field(default_factory=list)
    latitude: float
    longitude: float
    location_name: str
    department: str
    description: str = ""
    image_url: str = ""
    duplicate_of: Optional[str] = None


class Complaint(BaseModel):
    id: str
    report_id: str
    problem_type: ProblemType
    confidence: float
    severity: SeverityLevel
    evidence: List[str]
    latitude: float
    longitude: float
    location_name: str
    department: str
    description: str
    image_url: str
    status: ComplaintStatus
    duplicate_of: Optional[str] = None
    created_at: str
    updated_at: str
    resolution_image_url: Optional[str] = None
    resolution_image_path: Optional[str] = None
    resolution_note: Optional[str] = None
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    citizen_verification_status: Optional[CitizenVerificationStatus] = None
    citizen_resolution_confirmed: Optional[bool] = None
    citizen_resolution_confirmed_at: Optional[str] = None
    citizen_verified_at: Optional[str] = None
    citizen_reopened: Optional[bool] = None
    citizen_reopened_at: Optional[str] = None
    reopened_at: Optional[str] = None
    reopen_reason: Optional[str] = None
    status_history: List[StatusHistoryItem] = Field(default_factory=list)


class StatusUpdate(BaseModel):
    status: ComplaintStatus
    resolution_image_url: Optional[str] = None
    resolution_note: Optional[str] = None


class ResolveComplaintRequest(BaseModel):
    resolution_image_url: Optional[str] = None
    resolution_note: Optional[str] = None


class ReopenComplaintRequest(BaseModel):
    reason: Optional[str] = ""


class HotspotInfo(BaseModel):
    id: Optional[str] = None
    title: str
    dominant_issue: str
    total_reports: int
    unresolved_count: int
    high_critical_count: int
    trend_percentage: float
    suggested_action: str
    latitude: float
    longitude: float
    radius_km: float
    repeated_count: Optional[int] = 0
    report_ids: Optional[List[str]] = Field(default_factory=list)


class DailyTrendPoint(BaseModel):
    date: str
    day_label: str
    count: int


class DashboardStatistics(BaseModel):
    total_reports: int
    high_critical: int
    pending: int
    in_progress: int
    resolved: int
    awaiting_verification: int = 0
    reopened: int = 0
    by_category: Dict[str, int]
    by_severity: Dict[str, int]
    by_status: Dict[str, int]
    hotspots: List[HotspotInfo]
    daily_trends: Optional[List[DailyTrendPoint]] = Field(default_factory=list)


class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: float
    problem_type: str
    severity: str
    report_id: str
