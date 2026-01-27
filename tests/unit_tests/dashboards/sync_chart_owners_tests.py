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
from unittest.mock import MagicMock

import json
import pytest
from superset.models.dashboard import Dashboard


def test_sync_disabled_when_auto_sync_not_set() -> None:
    """
    Test that sync does nothing when auto_sync_chart_owners is not in metadata
    """
    # Setup
    dashboard = Dashboard()
    dashboard.json_metadata = '{}'

    owner1 = MagicMock(id=1)
    owner2 = MagicMock(id=2)

    slice_mock = MagicMock()
    slice_mock.owners = [owner1]

    dashboard.slices = [slice_mock]
    dashboard.owners = [owner2]

    # Execute
    dashboard.sync_dashboard_chart_owners()

    # Assert - slice owners should contain only the original owner
    assert len(slice_mock.owners) == 1
    assert slice_mock.owners[0].id == 1

    # Dashboard owner should NOT be added
    assert not any(owner.id == 2 for owner in slice_mock.owners)


def test_sync_disabled_when_auto_sync_false() -> None:
    """
    Test that sync does nothing when auto_sync_chart_owners is False
    """
    # Setup
    dashboard = Dashboard()
    dashboard.json_metadata = '{"auto_sync_chart_owners": false}'

    owner1 = MagicMock(id=1)
    owner2 = MagicMock(id=2)

    slice_mock = MagicMock()
    slice_mock.owners = [owner1]

    dashboard.slices = [slice_mock]
    dashboard.owners = [owner2]

    # Execute
    dashboard.sync_dashboard_chart_owners()

    # Assert - slice owners should contain only the original owner
    assert len(slice_mock.owners) == 1
    assert slice_mock.owners[0].id == 1

    # Dashboard owner should NOT be added
    assert not any(owner.id == 2 for owner in slice_mock.owners)


def test_sync_skips_charts_with_no_mutual_owners() -> None:
    """
    Test that charts with no mutual owners are skipped
    """
    # Setup
    dashboard = Dashboard()
    dashboard.json_metadata = '{"auto_sync_chart_owners": true}'

    owner1 = MagicMock(id=1)
    owner2 = MagicMock(id=2)
    owner3 = MagicMock(id=3)
    owner4 = MagicMock(id=4)

    slice_mock = MagicMock()
    slice_mock.owners = [owner1, owner2]

    dashboard.slices = [slice_mock]
    dashboard.owners = [owner3, owner4]

    # Execute
    dashboard.sync_dashboard_chart_owners()

    # Assert - slice owners should contain only the original owner
    assert len(slice_mock.owners) == 2
    assert slice_mock.owners == [owner1, owner2]
    assert dashboard.owners == [owner3, owner4]


def test_sync_skips_charts_that_already_have_all_dashboard_owners() -> None:
    """
    Test that charts already containing all dashboard owners are skipped
    """
    # Setup
    dashboard = Dashboard()
    dashboard.json_metadata = '{"auto_sync_chart_owners": true}'

    owner1 = MagicMock(id=1)
    owner2 = MagicMock(id=2)
    owner3 = MagicMock(id=3)

    slice_mock = MagicMock()
    slice_mock.owners = [owner1, owner2, owner3]

    dashboard.slices = [slice_mock]
    dashboard.owners = [owner1, owner2]

    # Execute
    dashboard.sync_dashboard_chart_owners()

    # Slice should be skipped and owners attribute should never have been accessed
    # for modification
    assert len(slice_mock.method_calls) == 0
    assert len(slice_mock.owners) == 3  # Should remain unchanged
    assert len(dashboard.owners) == 2  # Dashboard owners should remain unchanged


def test_sync_adds_dashboard_owners_to_charts_with_mutual_owners() -> None:
    """
    Test that dashboard owners are added to charts with mutual owners
    """
    # Setup
    dashboard = Dashboard()
    dashboard.json_metadata = '{"auto_sync_chart_owners": true}'

    owner1 = MagicMock(id=1)
    owner2 = MagicMock(id=2)
    owner3 = MagicMock(id=3)
    owner4 = MagicMock(id=4)

    slice_mock = MagicMock()
    slice_mock.owners = [owner1, owner4]
    slice_mock.id = 1

    dashboard.slices = [slice_mock]
    dashboard.owners = [owner1, owner2, owner3]

    # Execute
    dashboard.sync_dashboard_chart_owners()

    expected_owners = {owner1, owner2, owner3, owner4}
    assert set(slice_mock.owners) == expected_owners


def test_sync_handles_multiple_charts_differently() -> None:
    """
    Test that sync handles multiple charts based on their individual
    owner sets
    """
    # Setup
    dashboard = Dashboard()
    dashboard.json_metadata = '{"auto_sync_chart_owners": true}'

    # Create mock owners
    owner1 = MagicMock(id=1)
    owner2 = MagicMock(id=2)
    owner3 = MagicMock(id=3)
    owner4 = MagicMock(id=4)

    dashboard.owners = [owner1, owner2]

    # Slice 1: Has mutual owner, should be synced
    slice1 = MagicMock()
    slice1.owners = [owner1, owner3]

    # Slice 2: No mutual owners, should be skipped
    slice2 = MagicMock()
    slice2.owners = [owner3, owner4]

    # Slice 3: Already has all dashboard owners, should be skipped
    slice3 = MagicMock()
    slice3.owners = [owner1, owner2, owner3]

    dashboard.slices = [slice1, slice2, slice3]

    # Execute
    dashboard.sync_dashboard_chart_owners()

    # Slice 1 should have dashboard owners added
    assert len(slice1.owners) == 3
    assert set(slice1.owners) == {owner1, owner2, owner3}

    # Slice 2 should remain unchanged
    assert len(slice2.owners) == 2
    assert set(slice2.owners) == {owner3, owner4}

    # Slice 3 should remain unchanged
    assert len(slice3.owners) == 3
    assert set(slice3.owners) == {owner1, owner2, owner3}


def test_sync_with_empty_dashboard_owners() -> None:
    """
    Test sync behavior when dashboard has no owners
    """
    # Setup
    dashboard = Dashboard()
    dashboard.json_metadata = '{"auto_sync_chart_owners": true}'

    owner1 = MagicMock(id=1)

    slice_mock = MagicMock()
    slice_mock.owners = [owner1]
    slice_mock.id = 1

    dashboard.slices = [slice_mock]
    dashboard.owners = []

    # Execute
    dashboard.sync_dashboard_chart_owners()
    assert len(slice_mock.method_calls) == 0
    assert len(slice_mock.owners) == 1  # Should remain unchanged


def test_sync_with_empty_slices() -> None:
    """
    Test sync behavior when dashboard has no slices
    """
    # Setup
    dashboard = Dashboard()
    dashboard.json_metadata = '{"auto_sync_chart_owners": true}'

    owner1 = MagicMock(id=1)

    dashboard.slices = []
    dashboard.owners = [owner1]

    # Execute
    dashboard.sync_dashboard_chart_owners()

    assert len(dashboard.owners) == 1  # Should remain unchanged
    assert len(dashboard.slices) == 0  # Should remain unchanged


def test_sync_with_malformed_json_metadata() -> None:
    """
    Test sync behavior when json_metadata is malformed
    """
    # Setup
    dashboard = Dashboard()
    dashboard.json_metadata = 'invalid'

    # Execute - should raise JSONDecodeError
    with pytest.raises(json.JSONDecodeError):
        dashboard.sync_dashboard_chart_owners()


def test_sync_commits_changes_to_database(mocker) -> None:
    """
    Test that sync changes are committed to the database
    """
    # Setup
    mock_session = mocker.patch("superset.models.dashboard.db.session")

    dashboard = Dashboard()
    dashboard.json_metadata = '{"auto_sync_chart_owners": true}'

    owner = MagicMock(id=1)
    dashboard.owners = [owner]

    slice_mock = MagicMock()
    slice_mock.owners = [owner, MagicMock(id=2)]
    dashboard.slices = [slice_mock]

    # Execute
    dashboard.sync_dashboard_chart_owners()
    mock_session.commit.assert_called_once()

    # Assert - slice owners should now include the dashboard owner
    assert len(slice_mock.owners) == 2
    assert owner in slice_mock.owners
