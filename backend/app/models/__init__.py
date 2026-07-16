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
from app.models.sms_gateway_config import SmsGatewayConfig  # noqa: F401
from app.models.territory import Territory, UserTerritoryAssignment  # noqa: F401
from app.models.system_backup import SystemBackup  # noqa: F401
from app.models.scoring_factor import ScoringFactor, ScoringFactorOption  # noqa: F401
from app.models.farmer_photo import FarmerPhoto  # noqa: F401
from app.models.form_template import FormTemplate  # noqa: F401
from app.models.notification_preference import NotificationPreference  # noqa: F401
