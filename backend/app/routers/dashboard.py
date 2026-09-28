from typing import List, Dict, Any
from fastapi import APIRouter
from ..models.schemas import DashboardStatistics, HeatmapPoint
from ..services.store import data_store

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/statistics", response_model=DashboardStatistics)
def get_dashboard_statistics():
    """Aggregate live metrics, category breakdowns, daily trends, and spatial hotspots."""
    return data_store.get_statistics()


@router.get("/heatmap", response_model=List[HeatmapPoint])
def get_dashboard_heatmap():
    """Retrieve geo-weighted points for GIS canvas heatmap visualization."""
    return data_store.get_heatmap_points()


@router.post("/reset-demo", response_model=Dict[str, Any])
def reset_demo_dataset():
    """Reset municipal complaint store back to pristine sample demonstration state."""
    return data_store.reset_demo()
