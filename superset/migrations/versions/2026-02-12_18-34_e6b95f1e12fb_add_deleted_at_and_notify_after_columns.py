# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""Add pinterest_deleted_at and pinterest_notify_after columns for governance

Revision ID: e6b95f1e12fb
Revises: 74ad1125881c
Create Date: 2026-02-12 18:34:59.807308

Adds Pinterest-specific columns for dashboard governance soft-deletion and
garbage collection: pinterest_deleted_at (soft-delete timestamp) and
pinterest_notify_after (date after which deletion notification should be sent)
on dashboards; pinterest_deleted_at on slices (charts) and tables (datasets).
Column names are prefixed with pinterest_ to distinguish from open source columns.
"""

# revision identifiers, used by Alembic.
revision = "e6b95f1e12fb"
down_revision = "74ad1125881c"

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("dashboards") as batch_op:
        batch_op.add_column(
            sa.Column("pinterest_deleted_at", sa.DateTime(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("pinterest_notify_after", sa.DateTime(), nullable=True)
        )

    with op.batch_alter_table("slices") as batch_op:
        batch_op.add_column(
            sa.Column("pinterest_deleted_at", sa.DateTime(), nullable=True)
        )

    with op.batch_alter_table("tables") as batch_op:
        batch_op.add_column(
            sa.Column("pinterest_deleted_at", sa.DateTime(), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("dashboards") as batch_op:
        batch_op.drop_column("pinterest_notify_after")
        batch_op.drop_column("pinterest_deleted_at")

    with op.batch_alter_table("slices") as batch_op:
        batch_op.drop_column("pinterest_deleted_at")

    with op.batch_alter_table("tables") as batch_op:
        batch_op.drop_column("pinterest_deleted_at")
