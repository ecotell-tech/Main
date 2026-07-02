"""Initial schema — create all 45 tables from database/schema.sql

Revision ID: 001
Revises:
Create Date: 2026-05-25

This migration reads the canonical schema.sql file and executes every
DDL statement, skipping the CREATE DATABASE / USE directives (the DB is
already selected via the connection URL).
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence, Union

from alembic import op

# revision identifiers
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _load_statements() -> list[str]:
    """
    Locate and parse schema.sql, returning individual SQL statements.

    Search order:
      1. /app/database/schema.sql   — inside the Docker container
      2. <repo_root>/database/schema.sql — local dev (4 levels up from this file)
    """
    candidates = [
        Path("/app/database/schema.sql"),
        Path(__file__).parents[3] / "database" / "schema.sql",
    ]

    sql_path: Path | None = None
    for p in candidates:
        if p.exists():
            sql_path = p
            break

    if sql_path is None:
        raise FileNotFoundError(
            "schema.sql not found. Mount ./database to /app/database inside "
            "the backend container, or run alembic from the repo root."
        )

    content = sql_path.read_text(encoding="utf-8")

    # Strip single-line SQL comments so they don't interfere with splitting
    content = re.sub(r"--[^\n]*", "", content)

    statements: list[str] = []
    for raw in content.split(";"):
        stmt = raw.strip()
        if not stmt:
            continue
        # Skip database-selection directives (handled by the connection URL)
        if re.match(r"(?i)^(CREATE\s+DATABASE|USE\s+)", stmt):
            continue
        statements.append(stmt)

    return statements


def upgrade() -> None:
    statements = _load_statements()
    for stmt in statements:
        op.execute(stmt)


def downgrade() -> None:
    # Drop tables in reverse dependency order to respect foreign keys
    tables = [
        "report_exports",
        "deo_capture_targets",
        "system_backups",
        "bulk_import_logs",
        "impersonate_sessions",
        "farmer_awareness",
        "farmer_awareness_programs",
        "user_devices",
        "user_documents",
        "user_emergency_contacts",
        "user_languages",
        "languages",
        "activity_logs",
        "draft_registrations",
        "notification_preferences",
        "scoring_factor_options",
        "scoring_factors",
        "farm_photos",
        "visits",
        "visit_types",
        "plan_component_statuses",
        "consulting_plans",
        "plan_component_types",
        "farmer_irrigation_infrastructure",
        "irrigation_infrastructure_types",
        "farmer_inputs",
        "inputs",
        "farmer_govt_schemes",
        "govt_schemes",
        "farmer_challenges",
        "challenges",
        "farmer_user_assignments",
        "farmer_crops",
        "farmers",
        "crops",
        "user_territory_assignments",
        "territories",
        "villages",
        "talukas",
        "districts",
        "states",
        "otp_sessions",
        "users",
        "role_permissions",
        "permissions",
        "roles",
    ]
    for table in tables:
        op.execute(f"DROP TABLE IF EXISTS `{table}`")
