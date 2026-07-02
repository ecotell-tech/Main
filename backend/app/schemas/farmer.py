from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Photo schema ──────────────────────────────────────────────

class FarmerPhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:         int
    photo_type: str
    file_path:  str
    caption:    Optional[str] = None
    created_at: datetime


# ── Write schemas (request bodies) ────────────────────────────

class FarmerCreate(BaseModel):
    farmer_code: Optional[str] = None  # custom ID — auto-generated if omitted
    first_name: str
    middle_name: Optional[str] = None
    last_name:  Optional[str] = None
    mobile: str
    alt_mobile: Optional[str] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    dob: Optional[date] = None
    age: Optional[int] = Field(default=None, ge=1, le=120)
    education_level: Literal[
        "None", "Primary", "Secondary", "Graduate", "Post Graduate"
    ] = "None"

    # Location
    village_id:    Optional[int] = None
    pin_code:      Optional[str] = None
    nearest_mandi: Optional[str] = None
    gps_lat:       Optional[Decimal] = None
    gps_lng:       Optional[Decimal] = None

    # Farm
    land_acres:               Optional[Decimal] = None
    irrigated_land_acres:     Optional[Decimal] = None
    non_irrigated_land_acres: Optional[Decimal] = None
    soil_type:                Optional[str] = None
    water_source:             Optional[str] = None
    land_ownership: Optional[Literal["owned", "leased", "share_cropped", "other"]] = None

    # Practice
    farming_type: Literal["chemical", "organic", "natural", "mixed"] = "chemical"
    practice_notes: Optional[str] = None

    # Readiness
    interest_level:       Optional[Literal["high", "medium", "low"]] = None
    training_willingness: Optional[Literal["very_willing", "moderate", "not_willing"]] = None
    adoption_timeline:    Optional[str] = None

    # Engagement
    priority:    Optional[Literal["high", "medium", "low"]] = None
    next_action: Optional[str] = None
    referred_by: Optional[str] = None

    # Meta
    family_members: Optional[int] = None
    annual_income:  Optional[Decimal] = None
    survey_date:    Optional[date] = None

    # Extended / custom fields (team-lead-configured extra data)
    custom_fields: Optional[dict] = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        digits = v.replace(" ", "").replace("-", "")
        if not digits.isdigit() or len(digits) < 10:
            raise ValueError("Mobile must be at least 10 digits")
        return digits


class FarmerUpdate(BaseModel):
    # Identity
    farmer_code:     Optional[str] = None
    first_name:      Optional[str] = None
    middle_name:     Optional[str] = None
    last_name:       Optional[str] = None
    alt_mobile:      Optional[str] = None
    gender:          Optional[Literal["male", "female", "other"]] = None
    dob:             Optional[date] = None
    age:             Optional[int] = Field(default=None, ge=1, le=120)
    education_level: Optional[Literal["None", "Primary", "Secondary", "Graduate", "Post Graduate"]] = None

    # Location
    village_id:    Optional[int] = None
    pin_code:      Optional[str] = None
    nearest_mandi: Optional[str] = None
    gps_lat:       Optional[Decimal] = None
    gps_lng:       Optional[Decimal] = None

    # Farm
    land_acres:               Optional[Decimal] = None
    irrigated_land_acres:     Optional[Decimal] = None
    non_irrigated_land_acres: Optional[Decimal] = None
    soil_type:                Optional[str] = None
    water_source:             Optional[str] = None
    land_ownership:           Optional[Literal["owned", "leased", "share_cropped", "other"]] = None

    # Crop / Practice
    crop_names:            Optional[list[str]] = None  # replaces all crops when provided
    annual_yield_quintals: Optional[Decimal] = None
    yield_history_notes:   Optional[str] = None
    farming_type:          Optional[Literal["chemical", "organic", "natural", "mixed"]] = None
    practice_notes:        Optional[str] = None

    # Readiness
    interest_level:       Optional[Literal["high", "medium", "low"]] = None
    training_willingness: Optional[Literal["very_willing", "moderate", "not_willing"]] = None
    adoption_timeline:    Optional[str] = None
    attended_training:    Optional[int] = None

    # Engagement
    consult_notes: Optional[str] = None
    followup_date: Optional[date] = None
    priority:      Optional[Literal["high", "medium", "low"]] = None
    next_action:   Optional[str] = None
    referred_by:   Optional[str] = None
    plan_status:   Optional[Literal["pending", "active", "completed", "inactive"]] = None

    # Meta
    family_members:   Optional[int] = None
    annual_income:    Optional[Decimal] = None
    survey_date:      Optional[date] = None
    submission_notes: Optional[str] = None

    # Extended / custom fields (merged JSON blob — replaces entire dict on update)
    custom_fields: Optional[dict] = None


class CropsPayload(BaseModel):
    """Body for PUT /farmers/{id}/crops — replaces all crops for a farmer."""
    crop_names: list[str]


class RejectFarmerPayload(BaseModel):
    """Body for PUT /farmers/{id}/reject — team lead rejects a registration."""
    reason: Optional[str] = Field(default=None, max_length=500)


# ── Read schemas (response bodies) ────────────────────────────

class FarmerSummary(BaseModel):
    """Lightweight row used in list views."""
    model_config = ConfigDict(from_attributes=True)

    id:             int
    farmer_code:    str
    name:           str
    initials:       Optional[str] = None
    mobile:         str
    gender:         Optional[str] = None
    village_id:     Optional[int] = None
    village_name:   Optional[str] = None
    taluka_name:    Optional[str] = None
    district_name:  Optional[str] = None
    land_acres:     Optional[Decimal] = None
    farming_type:   str
    adoption_score: Optional[int] = None
    plan_status:    str
    last_visit_date: Optional[date] = None
    next_visit_date: Optional[date] = None
    avatar_gradient: Optional[str] = None
    created_at:      datetime
    # Review workflow
    review_status:          str = "pending_review"
    rejection_reason:       Optional[str] = None
    registered_by_user_id:  Optional[int] = None
    rep_name:               Optional[str] = None


class FarmerDetail(FarmerSummary):
    """Full record returned by GET /farmers/{id}."""
    first_name:              str
    middle_name:             Optional[str] = None
    last_name:               Optional[str] = None
    alt_mobile:              Optional[str] = None
    dob:                     Optional[date] = None
    age:                     Optional[int] = None
    education_level:         str
    pin_code:                Optional[str] = None
    nearest_mandi:           Optional[str] = None
    gps_lat:                 Optional[Decimal] = None
    gps_lng:                 Optional[Decimal] = None
    irrigated_land_acres:    Optional[Decimal] = None
    non_irrigated_land_acres: Optional[Decimal] = None
    soil_type:               Optional[str] = None
    water_source:            Optional[str] = None
    land_ownership:          Optional[str] = None
    annual_yield_quintals:   Optional[Decimal] = None
    farming_type:            str
    practice_notes:          Optional[str] = None
    interest_level:          Optional[str] = None
    training_willingness:    Optional[str] = None
    adoption_timeline:       Optional[str] = None
    attended_training:       int
    consult_notes:           Optional[str] = None
    followup_date:           Optional[date] = None
    appointment_date:        Optional[date] = None
    priority:                Optional[str] = None
    next_action:             Optional[str] = None
    referred_by:             Optional[str] = None
    family_members:          Optional[int] = None
    annual_income:           Optional[Decimal] = None
    registered_by_user_id:   Optional[int] = None
    submitted_by_role:       Optional[str] = None
    survey_date:             Optional[date] = None
    approved_by_user_id:     Optional[int] = None
    approved_date:           Optional[date] = None
    submission_notes:        Optional[str] = None
    updated_at:              datetime

    # Joined fields
    state_name:    Optional[str] = None
    primary_crop:  Optional[str] = None
    rep_name:      Optional[str] = None
    rep_mobile:    Optional[str] = None

    # Sensitive — stored masked at write time; only returned on detail endpoint
    aadhaar_masked:      Optional[str] = None
    bank_account_masked: Optional[str] = None

    # Extended / custom field values (team-lead-configured)
    custom_fields: Optional[dict] = None

    # Photos and crops — loaded separately after main query
    farm_photos:   List[FarmerPhotoOut] = []
    crops:         List[str] = []


class FarmerListResponse(BaseModel):
    farmers: list[FarmerSummary]
    total:   int
    page:    int
    limit:   int
    pages:   int


class MobileCheckResponse(BaseModel):
    duplicate: bool
    farmer_id: Optional[int] = None


# ── Bulk import schemas ────────────────────────────────────────

class BulkFarmerRow(BaseModel):
    """One data row for bulk import — FarmerCreate fields plus name-based geography."""
    farmer_code:              Optional[str]     = None
    first_name:               str
    middle_name:              Optional[str]     = None
    last_name:                Optional[str]     = None
    mobile:                   str
    alt_mobile:               Optional[str]     = None
    gender:                   Optional[Literal["male", "female", "other"]] = None
    dob:                      Optional[date]    = None
    education_level:          Literal[
        "None", "Primary", "Secondary", "Graduate", "Post Graduate"
    ] = "None"

    # Geography: accept names (resolved server-side) or direct ID
    village_id:               Optional[int]     = None
    state_name:               Optional[str]     = None
    district_name:            Optional[str]     = None
    taluka_name:              Optional[str]     = None
    village_name:             Optional[str]     = None
    pin_code:                 Optional[str]     = None
    nearest_mandi:            Optional[str]     = None
    gps_lat:                  Optional[Decimal] = None
    gps_lng:                  Optional[Decimal] = None

    # Farm
    land_acres:               Optional[Decimal] = None
    irrigated_land_acres:     Optional[Decimal] = None
    non_irrigated_land_acres: Optional[Decimal] = None
    soil_type:                Optional[str]     = None
    water_source:             Optional[str]     = None
    land_ownership:           Optional[Literal["owned", "leased", "share_cropped", "other"]] = None
    farming_type:             Literal["chemical", "organic", "natural", "mixed"] = "chemical"

    # Practice
    practice_notes:           Optional[str]     = None
    primary_crop:             Optional[str]     = None  # resolved from master crop table

    # Readiness
    interest_level:           Optional[Literal["high", "medium", "low"]] = None
    training_willingness:     Optional[Literal["very_willing", "moderate", "not_willing"]] = None
    adoption_timeline:        Optional[str]     = None

    # Engagement
    priority:                 Optional[Literal["high", "medium", "low"]] = None
    next_action:              Optional[str]     = None
    referred_by:              Optional[str]     = None

    # Meta
    family_members:           Optional[int]     = None
    annual_income:            Optional[Decimal] = None
    survey_date:              Optional[date]    = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        digits = v.replace(" ", "").replace("-", "")
        if not digits.isdigit() or len(digits) < 10:
            raise ValueError("Mobile must be at least 10 digits")
        return digits


class BulkFarmerCreate(BaseModel):
    farmers: list[BulkFarmerRow]


class BulkImportRowResult(BaseModel):
    row:         int
    success:     bool
    farmer_id:   Optional[int] = None
    farmer_code: Optional[str] = None
    error:       Optional[str] = None


class BulkImportResponse(BaseModel):
    imported: int
    skipped:  int
    results:  list[BulkImportRowResult]
