"""Incidents catalog endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.experiments import Incident
from app.schemas import IncidentResponse

router = APIRouter(tags=["Incidents"])


@router.get("/incidents", response_model=List[IncidentResponse])
def list_incidents(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve recorded incidents from chaos experiments."""
    return db.query(Incident).order_by(Incident.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    """Retrieve specific incident details."""
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc
