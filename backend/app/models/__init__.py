# Import all models here so Alembic's env.py can discover every table
# via a single `from app.models import *` or `import app.models`.
from app.models.auth import Permission, Role, RolePermission, User  # noqa: F401
from app.models.farmer import Farmer  # noqa: F401
from app.models.geography import District, State, Taluka, Village  # noqa: F401
from app.models.master import (  # noqa: F401
    Challenge, Crop, GovtScheme, Input, IrrigationInfrastructureType,
)
from app.models.plan import ConsultingPlan, PlanComponentStatus, PlanComponentType  # noqa: F401
from app.models.visit import Visit, VisitType  # noqa: F401
from app.models.associations import (  # noqa: F401
    FarmerChallenge, FarmerCrop, FarmerGovtScheme,
    FarmerInput, FarmerIrrigationInfrastructure, FarmerUserAssignment,
)
