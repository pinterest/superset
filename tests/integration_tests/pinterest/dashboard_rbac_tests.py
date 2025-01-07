import json

import pytest
from flask_appbuilder.security.sqla.models import (
    assoc_permissionview_role,
    PermissionView,
    Role,
)

from superset import db, security_manager
from superset.models.dashboard import Dashboard
from tests.integration_tests.base_tests import SupersetTestCase
from tests.integration_tests.conftest import with_feature_flags
from tests.integration_tests.fixtures.birth_names_dashboard import (
    load_birth_names_dashboard_with_slices,
    load_birth_names_data,
)
from tests.integration_tests.utils.get_dashboards import get_dashboards_ids

TEST_RBAC_EDITOR_ROLE = "rbac_editor"
RBAC_EDITOR_PERMISSION = "can_edit"
RBAC_EDITOR_VIEW_MENU_NAME = "PinterestDashboardRoles"

RBAC_EDITOR_USERNAME = "rbac_editor_user"


class TestPinterestDashboardRBAC(SupersetTestCase):
    def setUp(self):
        # Create rbac editor role that has permission to edit a dashboard's roles
        security_manager.copy_role("Alpha", TEST_RBAC_EDITOR_ROLE, merge=False)
        security_manager.add_permission_view_menu(
            RBAC_EDITOR_PERMISSION, RBAC_EDITOR_VIEW_MENU_NAME
        )
        perm_view = security_manager.find_permission_view_menu(
            RBAC_EDITOR_PERMISSION, RBAC_EDITOR_VIEW_MENU_NAME
        )
        security_manager.add_permission_role(
            security_manager.find_role(TEST_RBAC_EDITOR_ROLE), perm_view
        )

        # Create rbac editor user
        self.create_user(
            RBAC_EDITOR_USERNAME,
            "general",
            TEST_RBAC_EDITOR_ROLE,
            email=f"{RBAC_EDITOR_USERNAME}@fab.org",
        )
        db.session.commit()

    def tearDown(self):
        # Remove rbac editor user and role
        pvs = (
            db.session.query(PermissionView)
            .join(assoc_permissionview_role)
            .join(Role)
            .filter(Role.id == security_manager.find_role(TEST_RBAC_EDITOR_ROLE).id)
            .all()
        )
        for pv in pvs:
            security_manager.del_permission_role(
                security_manager.find_role(TEST_RBAC_EDITOR_ROLE), pv
            )
        pv = security_manager.find_permission_view_menu(
            RBAC_EDITOR_PERMISSION, RBAC_EDITOR_VIEW_MENU_NAME
        )
        for role in ["Admin", "Alpha", "Gamma"]:
            security_manager.del_permission_role(security_manager.find_role(role), pv)
        db.session.delete(security_manager.find_role(TEST_RBAC_EDITOR_ROLE))
        security_manager.del_permission_view_menu(
            RBAC_EDITOR_PERMISSION, RBAC_EDITOR_VIEW_MENU_NAME
        )
        db.session.delete(security_manager.find_user(RBAC_EDITOR_USERNAME))
        db.session.commit()

    def _add_user_to_dashboard(self, dashboard_id: int, username: str):
        dashboard_id = get_dashboards_ids(["births"])[0]
        dashboard = Dashboard.get(dashboard_id)
        dashboard.owners.append(security_manager.find_user(username))
        db.session.commit()

    @with_feature_flags(DASHBOARD_RBAC=True)
    @pytest.mark.usefixtures(
        "load_birth_names_dashboard_with_slices",
    )
    def test_non_rbac_editor_editing_dashboard_roles(
        self,
    ):
        """Test that Alpha users (or users without can_edit PinterestDashboardRoles permission)
        cannot edit dashboard roles"""
        dashboard_id = get_dashboards_ids(["births"])[0]
        self._add_user_to_dashboard(dashboard_id, "alpha")

        self.login(username="alpha")

        # Attempt to edit dashboard roles
        dashboard_data = {
            "roles": [5],
        }
        rv = self.client.put(f"api/v1/dashboard/{dashboard_id}", json=dashboard_data)
        assert rv.status_code == 403
        self.logout()

    @with_feature_flags(DASHBOARD_RBAC=True)
    @pytest.mark.usefixtures(
        "load_birth_names_dashboard_with_slices",
    )
    def test_non_rbac_editor_editing_dashboard_properties(
        self,
    ):
        """Test that Alpha users (or users without can_edit PinterestDashboardRoles permission)
        can edit dashboard properties (that are not roles)"""
        dashboard_id = get_dashboards_ids(["births"])[0]
        self._add_user_to_dashboard(dashboard_id, "alpha")

        self.login(username="alpha")

        # Attempt to edit dashboard property
        dashboard_data = {
            "dashboard_title": "new title",
        }
        rv = self.client.put(f"api/v1/dashboard/{dashboard_id}", json=dashboard_data)
        assert rv.status_code == 200
        self.logout()

    @with_feature_flags(DASHBOARD_RBAC=True)
    @pytest.mark.usefixtures(
        "load_birth_names_dashboard_with_slices",
    )
    def test_rbac_editor_editing_dashboard_roles(
        self,
    ):
        """Test that users with can_edit PinterestDashboardRoles permission"""
        dashboard_id = get_dashboards_ids(["births"])[0]
        self._add_user_to_dashboard(dashboard_id, RBAC_EDITOR_USERNAME)

        self.login(username=RBAC_EDITOR_USERNAME)

        dashboard_data = {
            "roles": [4],
        }

        rv = self.client.put(f"api/v1/dashboard/{dashboard_id}", json=dashboard_data)
        assert rv.status_code == 200
        self.logout()

    @with_feature_flags(DASHBOARD_RBAC=True)
    def test_non_rbac_editor_create_dashboard_with_roles(self):
        alpha_id = self.get_user("alpha").id
        dashboard_data = {
            "dashboard_title": "title1",
            "slug": "slug2",
            "owners": [alpha_id],
            "position_json": '{"a": "A"}',
            "css": "css",
            "json_metadata": '{"refresh_frequency": 30}',
            "published": True,
            "roles": [4],
        }
        self.login(username="alpha")
        uri = "api/v1/dashboard/"
        rv = self.client.post(uri, json=dashboard_data)
        assert rv.status_code == 403
        self.logout()

    @with_feature_flags(DASHBOARD_RBAC=True)
    def test_non_rbac_editor_create_dashboard_without_roles(self):
        alpha_id = self.get_user("alpha").id
        dashboard_data = {
            "dashboard_title": "title1",
            "slug": "slug2",
            "owners": [alpha_id],
            "position_json": '{"a": "A"}',
            "css": "css",
            "json_metadata": '{"refresh_frequency": 30}',
            "published": True,
        }
        self.login(username="alpha")
        uri = "api/v1/dashboard/"
        rv = self.client.post(uri, json=dashboard_data)
        assert rv.status_code == 201
        self.logout()
        data = json.loads(rv.data.decode("utf-8"))
        model = db.session.query(Dashboard).get(data.get("id"))
        db.session.delete(model)
        db.session.commit()
