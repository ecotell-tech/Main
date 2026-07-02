from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, Enum, ForeignKey,
    JSON, Numeric, SmallInteger, String, Text,
)

from app.database import Base
from app.models.base import SoftDeleteMixin


class Farmer(SoftDeleteMixin, Base):
    __tablename__ = "farmers"

    # ── Identity ────────────────────────────────────────────────
    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    farmer_code   = Column(String(20),  nullable=False, unique=True)
    first_name    = Column(String(60),  nullable=False)
    middle_name   = Column(String(60))
    last_name     = Column(String(60))
    name          = Column(String(120), nullable=False)
    initials      = Column(String(5))
    mobile        = Column(String(15),  nullable=False, unique=True)
    alt_mobile    = Column(String(15))
    gender        = Column(Enum("male", "female", "other"))
    dob           = Column(Date)
    age           = Column(SmallInteger)
    education_level = Column(
        Enum("None", "Primary", "Secondary", "Graduate", "Post Graduate"),
        nullable=False, default="None",
    )
    aadhaar_masked      = Column(String(20))
    bank_account_masked = Column(String(25))

    # ── Location ────────────────────────────────────────────────
    village_id    = Column(BigInteger, ForeignKey("villages.id",  ondelete="SET NULL"))
    pin_code      = Column(String(10))
    nearest_mandi = Column(String(120))
    gps_lat       = Column(Numeric(10, 6))
    gps_lng       = Column(Numeric(10, 6))

    # ── Farm ────────────────────────────────────────────────────
    land_acres               = Column(Numeric(8, 2))
    irrigated_land_acres     = Column(Numeric(8, 2))
    non_irrigated_land_acres = Column(Numeric(8, 2))
    soil_type                = Column(String(80))
    water_source             = Column(String(80))
    land_ownership = Column(Enum("owned", "leased", "share_cropped", "other"))

    # ── Crop / Practice ─────────────────────────────────────────
    annual_yield_quintals = Column(Numeric(10, 2))
    crop_coverage_acres   = Column(Numeric(8, 2))
    yield_history_notes   = Column(Text)
    farming_type = Column(
        Enum("chemical", "organic", "natural", "mixed"),
        nullable=False, default="chemical",
    )
    practice_notes = Column(Text)

    # ── Readiness ───────────────────────────────────────────────
    interest_level       = Column(Enum("high", "medium", "low"))
    training_willingness = Column(Enum("very_willing", "moderate", "not_willing"))
    adoption_timeline    = Column(String(80))
    attended_training    = Column(SmallInteger, nullable=False, default=0)

    # ── Engagement ──────────────────────────────────────────────
    consult_notes    = Column(Text)
    followup_date    = Column(Date)
    appointment_date = Column(Date)
    priority         = Column(Enum("high", "medium", "low"))
    next_action      = Column(String(255))
    referred_by      = Column(String(120))

    # ── Scoring & Status ────────────────────────────────────────
    adoption_score  = Column(SmallInteger)
    plan_status = Column(
        Enum("pending", "active", "completed", "inactive"),
        nullable=False, default="pending",
    )
    last_visit_date = Column(Date)
    next_visit_date = Column(Date)

    # ── Meta ────────────────────────────────────────────────────
    family_members        = Column(SmallInteger)
    annual_income         = Column(Numeric(12, 2))
    registered_by_user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"))
    submitted_by_role     = Column(String(60))
    survey_date           = Column(Date)
    approved_by_user_id   = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"))
    approved_date         = Column(Date)
    submission_notes      = Column(Text)
    avatar_gradient       = Column(String(120))
    is_draft              = Column(Boolean, nullable=False, server_default='0')

    # ── Review workflow ─────────────────────────────────────────
    review_status = Column(
        Enum("pending_review", "approved", "rejected"),
        nullable=False, server_default="pending_review",
    )
    rejection_reason    = Column(String(500), nullable=True)
    rejected_by_user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    # Extended / custom field values — stores Leadership-configured extra data as JSON.
    # Schema-free by design: adding/removing extended fields never requires a migration.
    # Example: {"bank_ifsc_code": "SBIN0001234", "cooperative_member": "Yes"}
    custom_fields         = Column(JSON, nullable=True, server_default=None)
    # created_at, updated_at, deleted_at ← from SoftDeleteMixin
