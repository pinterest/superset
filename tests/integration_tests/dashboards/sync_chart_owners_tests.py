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
from superset import db
from superset.models.dashboard import Dashboard
from superset.models.slice import Slice
from tests.integration_tests.base_tests import SupersetTestCase


class TestSyncDashboardChartOwners(SupersetTestCase):
    def test_sync_dashboard_chart_owners(self):
        """
        Test the complete sync flow with real database objects
        """
        with self.app.app_context():
            # Create dashboard with auto_sync enabled
            dashboard = Dashboard(
                dashboard_title="Test Dashboard",
                json_metadata='{"auto_sync_chart_owners": true}'
            )

            # Create users (owners)
            dashboard_owner = self.get_user("admin")
            chart_owner = self.get_user("gamma")

            # Create a chart
            chart = Slice(
                slice_name="Test Chart",
                datasource_id=1,
                datasource_type="table"
            )

            # Set up relationships
            dashboard.owners = [dashboard_owner]
            chart.owners = [chart_owner, dashboard_owner]  # Mutual owner
            dashboard.slices = [chart]

            # Save to database
            db.session.add(dashboard)
            db.session.add(chart)
            db.session.commit()

            # Verify initial state
            assert len(chart.owners) == 2

            # Add another owner to dashboard
            new_dashboard_owner = self.get_user("alpha")
            dashboard.owners.append(new_dashboard_owner)
            db.session.commit()

            # Execute sync
            dashboard.sync_dashboard_chart_owners()
            db.session.commit()

            # Verify chart now has the new dashboard owner
            assert len(chart.owners) == 3
            assert set(chart.owners) == {
                dashboard_owner,
                chart_owner,
                new_dashboard_owner
            }

            # Clean up
            db.session.delete(dashboard)
            db.session.delete(chart)
            db.session.commit()
