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

import json  # noqa: TID251
from datetime import datetime
from unittest.mock import patch
from uuid import UUID

import pytest
from pytest_mock import MockerFixture

from superset.app import SupersetApp
from superset.commands.exceptions import UpdateFailedError
from superset.commands.report.exceptions import ReportScheduleExecutorNotFoundError
from superset.commands.report.execute import BaseReportState
from superset.dashboards.permalink.types import DashboardPermalinkState
from superset.reports.models import (
    ReportRecipients,
    ReportRecipientType,
    ReportSchedule,
    ReportScheduleType,
    ReportSourceFormat,
)
from superset.utils.core import HeaderDataType
from superset.utils.screenshots import ChartScreenshot
from tests.integration_tests.conftest import with_feature_flags


def test_log_data_with_chart(mocker: MockerFixture) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = True
    mock_report_schedule.chart_id = 123
    mock_report_schedule.dashboard_id = None
    mock_report_schedule.type = "report_type"
    mock_report_schedule.report_format = "report_format"
    mock_report_schedule.owners = [1, 2]
    mock_report_schedule.recipients = []

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule

    result: HeaderDataType = class_instance._get_log_data()

    expected_result: HeaderDataType = {
        "notification_type": "report_type",
        "notification_source": ReportSourceFormat.CHART,
        "notification_format": "report_format",
        "chart_id": 123,
        "dashboard_id": None,
        "owners": [1, 2],
        "slack_channels": None,
        "execution_id": "execution_id_example",
    }

    assert result == expected_result


def test_log_data_with_dashboard(mocker: MockerFixture) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = False
    mock_report_schedule.chart_id = None
    mock_report_schedule.dashboard_id = 123
    mock_report_schedule.type = "report_type"
    mock_report_schedule.report_format = "report_format"
    mock_report_schedule.owners = [1, 2]
    mock_report_schedule.recipients = []

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule

    result: HeaderDataType = class_instance._get_log_data()

    expected_result: HeaderDataType = {
        "notification_type": "report_type",
        "notification_source": ReportSourceFormat.DASHBOARD,
        "notification_format": "report_format",
        "chart_id": None,
        "dashboard_id": 123,
        "owners": [1, 2],
        "slack_channels": None,
        "execution_id": "execution_id_example",
    }

    assert result == expected_result


def test_log_data_with_email_recipients(mocker: MockerFixture) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = False
    mock_report_schedule.chart_id = None
    mock_report_schedule.dashboard_id = 123
    mock_report_schedule.type = "report_type"
    mock_report_schedule.report_format = "report_format"
    mock_report_schedule.owners = [1, 2]
    mock_report_schedule.recipients = []
    mock_report_schedule.recipients = [
        mocker.Mock(type=ReportRecipientType.EMAIL, recipient_config_json="email_1"),
        mocker.Mock(type=ReportRecipientType.EMAIL, recipient_config_json="email_2"),
    ]

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule

    result: HeaderDataType = class_instance._get_log_data()

    expected_result: HeaderDataType = {
        "notification_type": "report_type",
        "notification_source": ReportSourceFormat.DASHBOARD,
        "notification_format": "report_format",
        "chart_id": None,
        "dashboard_id": 123,
        "owners": [1, 2],
        "slack_channels": [],
        "execution_id": "execution_id_example",
    }

    assert result == expected_result


def test_log_data_with_slack_recipients(mocker: MockerFixture) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = False
    mock_report_schedule.chart_id = None
    mock_report_schedule.dashboard_id = 123
    mock_report_schedule.type = "report_type"
    mock_report_schedule.report_format = "report_format"
    mock_report_schedule.owners = [1, 2]
    mock_report_schedule.recipients = []
    mock_report_schedule.recipients = [
        mocker.Mock(type=ReportRecipientType.SLACK, recipient_config_json="channel_1"),
        mocker.Mock(type=ReportRecipientType.SLACK, recipient_config_json="channel_2"),
    ]

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule

    result: HeaderDataType = class_instance._get_log_data()

    expected_result: HeaderDataType = {
        "notification_type": "report_type",
        "notification_source": ReportSourceFormat.DASHBOARD,
        "notification_format": "report_format",
        "chart_id": None,
        "dashboard_id": 123,
        "owners": [1, 2],
        "slack_channels": ["channel_1", "channel_2"],
        "execution_id": "execution_id_example",
    }

    assert result == expected_result


def test_log_data_no_owners(mocker: MockerFixture) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = False
    mock_report_schedule.chart_id = None
    mock_report_schedule.dashboard_id = 123
    mock_report_schedule.type = "report_type"
    mock_report_schedule.report_format = "report_format"
    mock_report_schedule.owners = []
    mock_report_schedule.recipients = [
        mocker.Mock(type=ReportRecipientType.SLACK, recipient_config_json="channel_1"),
        mocker.Mock(type=ReportRecipientType.SLACK, recipient_config_json="channel_2"),
    ]

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule

    result: HeaderDataType = class_instance._get_log_data()

    expected_result: HeaderDataType = {
        "notification_type": "report_type",
        "notification_source": ReportSourceFormat.DASHBOARD,
        "notification_format": "report_format",
        "chart_id": None,
        "dashboard_id": 123,
        "owners": [],
        "slack_channels": ["channel_1", "channel_2"],
        "execution_id": "execution_id_example",
    }

    assert result == expected_result


def test_log_data_with_missing_values(mocker: MockerFixture) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = None
    mock_report_schedule.chart_id = None
    mock_report_schedule.dashboard_id = None
    mock_report_schedule.type = "report_type"
    mock_report_schedule.report_format = "report_format"
    mock_report_schedule.owners = [1, 2]
    mock_report_schedule.recipients = [
        mocker.Mock(type=ReportRecipientType.SLACK, recipient_config_json="channel_1"),
        mocker.Mock(
            type=ReportRecipientType.SLACKV2, recipient_config_json="channel_2"
        ),
    ]

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule

    result: HeaderDataType = class_instance._get_log_data()

    expected_result: HeaderDataType = {
        "notification_type": "report_type",
        "notification_source": ReportSourceFormat.DASHBOARD,
        "notification_format": "report_format",
        "chart_id": None,
        "dashboard_id": None,
        "owners": [1, 2],
        "slack_channels": ["channel_1", "channel_2"],
        "execution_id": "execution_id_example",
    }

    assert result == expected_result


@pytest.mark.parametrize(
    "anchors, permalink_side_effect, expected_paths",
    [
        # Test user select multiple tabs to export in a dashboard report
        (
            ["mock_tab_anchor_1", "mock_tab_anchor_2"],
            ["url1", "url2"],
            [
                "superset/dashboard/p/url1/",
                "superset/dashboard/p/url2/",
            ],
        ),
        # Test user select one tab to export in a dashboard report
        (
            "mock_tab_anchor_1",
            ["url1"],
            ["superset/dashboard/p/url1/"],
        ),
        # Test JSON scalar string anchor falls back to single tab
        (
            json.dumps("mock_tab_anchor_1"),
            ["url1"],
            ["superset/dashboard/p/url1/"],
        ),
    ],
)
@patch(
    "superset.commands.dashboard.permalink.create.CreateDashboardPermalinkCommand.run"
)
@with_feature_flags(ALERT_REPORT_TABS=True)
def test_get_dashboard_urls_with_multiple_tabs(
    mock_run, mocker: MockerFixture, anchors, permalink_side_effect, expected_paths, app
) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = False
    mock_report_schedule.chart_id = None
    mock_report_schedule.dashboard_id = 123
    mock_report_schedule.type = "report_type"
    mock_report_schedule.report_format = "report_format"
    mock_report_schedule.owners = [1, 2]
    mock_report_schedule.recipients = []
    mock_report_schedule.extra = {
        "dashboard": {
            "anchor": json.dumps(anchors) if isinstance(anchors, list) else anchors,
            "dataMask": None,
            "activeTabs": None,
            "urlParams": None,
        }
    }
    mock_report_schedule.get_native_filters_params.return_value = (  # type: ignore
        "()",
        [],
    )

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule
    mock_run.side_effect = permalink_side_effect

    result: list[str] = class_instance.get_dashboard_urls()

    # Build expected URIs using the app's configured WEBDRIVER_BASEURL
    # Use urljoin to handle proper URL joining (handles double slashes)
    import urllib.parse

    base_url = app.config.get("WEBDRIVER_BASEURL", "http://0.0.0.0:8080/")
    expected_uris = [urllib.parse.urljoin(base_url, path) for path in expected_paths]
    assert result == expected_uris


@with_feature_flags(ALERT_REPORT_TABS=True)
def test_get_dashboard_urls_with_exporting_dashboard_only(
    mocker: MockerFixture,
) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = False
    mock_report_schedule.chart_id = None
    mock_report_schedule.dashboard_id = 123
    mock_report_schedule.force_screenshot = False
    mock_report_schedule.type = "report_type"
    mock_report_schedule.report_format = "report_format"
    mock_report_schedule.owners = [1, 2]
    mock_report_schedule.recipients = []
    mock_report_schedule.extra = {
        "dashboard": {
            "anchor": "",
            "dataMask": None,
            "activeTabs": None,
            "urlParams": None,
        }
    }
    mock_report_schedule.get_native_filters_params.return_value = (  # type: ignore
        "()",
        [],
    )
    mock_dashboard = mocker.MagicMock()
    mock_dashboard.uuid = UUID("12345678-1234-1234-1234-123456789abc")
    mock_report_schedule.dashboard = mock_dashboard

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule

    result: list[str] = class_instance.get_dashboard_urls()

    assert len(result) == 1
    assert "/dashboard/p/" not in result[0]
    assert "12345678-1234-1234-1234-123456789abc" in result[0]


@patch("superset.commands.report.execute.CreateDashboardPermalinkCommand")
@with_feature_flags(ALERT_REPORT_TABS=True)
def test_get_dashboard_urls_empty_dashboard_state_skips_permalink(
    mock_permalink_cls,
    mocker: MockerFixture,
) -> None:
    """When both ALERT_REPORT_TABS and ALERT_REPORTS_FILTER are enabled but the
    report has no tab or filter configured, get_dashboard_urls() must return
    a plain dashboard URL and must not create a permalink.  A permalink with
    nothing to encode causes a server-side redirect that fails the Playwright
    screenshot (domcontentloaded timeout)."""
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = False
    mock_report_schedule.force_screenshot = False
    mock_report_schedule.extra = {"dashboard": {}}
    mock_report_schedule.get_native_filters_params.return_value = ("()", [])  # type: ignore

    mock_dashboard = mocker.MagicMock()
    mock_dashboard.uuid = UUID("12345678-1234-1234-1234-123456789abc")
    mock_report_schedule.dashboard = mock_dashboard

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule

    result: list[str] = class_instance.get_dashboard_urls()

    mock_permalink_cls.assert_not_called()
    assert len(result) == 1
    assert "/dashboard/p/" not in result[0]
    assert "12345678-1234-1234-1234-123456789abc" in result[0]


@patch("superset.commands.report.execute.CreateDashboardPermalinkCommand")
@with_feature_flags(ALERT_REPORT_TABS=True)
def test_get_dashboard_urls_url_params_only_creates_permalink(
    mock_permalink_cls,
    mocker: MockerFixture,
) -> None:
    """When the dashboard state carries no anchor and no native filters but
    does carry meaningful urlParams (e.g. standalone=true), get_dashboard_urls()
    must still build a permalink so that state survives in the screenshot,
    rather than falling through to the plain dashboard URL."""
    mock_permalink_cls.return_value.run.return_value = "key1"
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = False
    mock_report_schedule.force_screenshot = False
    mock_report_schedule.extra = {
        "dashboard": {
            "anchor": "",
            "dataMask": None,
            "activeTabs": None,
            "urlParams": [["standalone", "true"]],
        }
    }
    mock_report_schedule.get_native_filters_params.return_value = ("()", [])  # type: ignore

    mock_dashboard = mocker.MagicMock()
    mock_dashboard.uuid = UUID("12345678-1234-1234-1234-123456789abc")
    mock_report_schedule.dashboard = mock_dashboard

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule

    result: list[str] = class_instance.get_dashboard_urls()

    mock_permalink_cls.assert_called_once()
    state = mock_permalink_cls.call_args.kwargs["state"]
    assert ["standalone", "true"] in state["urlParams"]
    assert len(result) == 1
    assert "/dashboard/p/" in result[0]


@patch(
    "superset.commands.dashboard.permalink.create.CreateDashboardPermalinkCommand.run"
)
def test_get_tab_urls(
    mock_run,
    mocker: MockerFixture,
    app,
) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.dashboard_id = 123

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule
    mock_run.side_effect = ["uri1", "uri2"]
    tab_anchors = ["1", "2"]
    result: list[str] = class_instance._get_tabs_urls(tab_anchors)
    import urllib.parse

    base_url = app.config.get("WEBDRIVER_BASEURL", "http://0.0.0.0:8080/")
    assert result == [
        urllib.parse.urljoin(base_url, "superset/dashboard/p/uri1/"),
        urllib.parse.urljoin(base_url, "superset/dashboard/p/uri2/"),
    ]


@patch(
    "superset.commands.dashboard.permalink.create.CreateDashboardPermalinkCommand.run"
)
def test_get_tab_url(
    mock_run,
    mocker: MockerFixture,
    app,
) -> None:
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.dashboard_id = 123

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule
    mock_run.return_value = "uri"
    dashboard_state = DashboardPermalinkState(
        anchor="1",
        dataMask=None,
        activeTabs=None,
        urlParams=None,
    )
    result: str = class_instance._get_tab_url(dashboard_state)
    import urllib.parse

    base_url = app.config.get("WEBDRIVER_BASEURL", "http://0.0.0.0:8080/")
    assert result == urllib.parse.urljoin(base_url, "superset/dashboard/p/uri/")


@patch("superset.commands.report.execute.db.session")
@patch(
    "superset.commands.dashboard.permalink.create.CreateDashboardPermalinkCommand.run"
)
def test_get_tab_url_commits_permalink_before_returning(
    mock_run,
    mock_session,
    mocker: MockerFixture,
    app,
) -> None:
    """Regression test for #40996.

    The report-generation flow runs inside an outer ``@transaction`` block,
    so ``CreateDashboardPermalinkCommand``'s inner ``@transaction`` decorator
    skips its own commit and leaves the permalink row flushed but uncommitted.
    Playwright then opens the permalink on a separate database connection and
    404s. ``_get_tab_url`` must therefore commit explicitly **after** the
    permalink command returns so the row is visible across connections.
    """
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.dashboard_id = 123

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule
    mock_run.return_value = "uri"
    dashboard_state = DashboardPermalinkState(
        anchor="1",
        dataMask=None,
        activeTabs=None,
        urlParams=None,
    )

    class_instance._get_tab_url(dashboard_state)

    mock_run.assert_called_once()
    mock_session.commit.assert_called_once()


@patch(
    "superset.commands.dashboard.permalink.create.CreateDashboardPermalinkCommand.run"
)
@with_feature_flags(ALERT_REPORT_TABS=False)
def test_get_dashboard_urls_native_filters_without_tabs(
    mock_run,
    mocker: MockerFixture,
    app,
) -> None:
    """Native filters should be applied even when ALERT_REPORT_TABS is disabled."""
    mock_report_schedule: ReportSchedule = mocker.Mock(spec=ReportSchedule)
    mock_report_schedule.chart = False
    mock_report_schedule.chart_id = None
    mock_report_schedule.dashboard_id = 123
    mock_report_schedule.force_screenshot = False
    extra = {
        "dashboard": {
            "nativeFilters": [
                {
                    "nativeFilterId": "NATIVE_FILTER-abc",
                    "filterType": "filter_select",
                    "columnName": "col1",
                    "filterValues": ["val1"],
                }
            ]
        }
    }
    mock_report_schedule.extra = extra  # type: ignore[assignment]
    mock_report_schedule.get_native_filters_params.return_value = (  # type: ignore
        "(NATIVE_FILTER-abc:!(val1))",
        [],
    )

    mock_dashboard = mocker.MagicMock()
    mock_dashboard.uuid = UUID("12345678-1234-1234-1234-123456789abc")
    mock_report_schedule.dashboard = mock_dashboard

    class_instance: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    class_instance._report_schedule = mock_report_schedule
    mock_run.return_value = "permalink_key"

    result: list[str] = class_instance.get_dashboard_urls()

    assert len(result) == 1
    assert "permalink_key" in result[0]


def create_report_schedule(
    mocker: MockerFixture,
    custom_width: int | None = None,
    custom_height: int | None = None,
) -> ReportSchedule:
    """Helper function to create a ReportSchedule instance with specified dimensions."""
    schedule = ReportSchedule()
    schedule.type = ReportScheduleType.REPORT
    schedule.name = "Test Report"
    schedule.description = "Test Description"
    schedule.chart = mocker.MagicMock()
    schedule.chart.id = 1
    schedule.dashboard = None
    schedule.database = None
    schedule.custom_width = custom_width
    schedule.custom_height = custom_height
    return schedule


@pytest.mark.parametrize(
    "test_id,custom_width,max_width,window_width,expected_width",
    [
        # Test when custom width exceeds max width
        ("exceeds_max", 2000, 1600, 800, 1600),
        # Test when custom width is less than max width
        ("under_max", 1200, 1600, 800, 1200),
        # Test when custom width is None (should use window width)
        ("no_custom", None, 1600, 800, 800),
        # Test when custom width equals max width
        ("equals_max", 1600, 1600, 800, 1600),
    ],
)
def test_screenshot_width_calculation(
    app: SupersetApp,
    mocker: MockerFixture,
    test_id: str,
    custom_width: int | None,
    max_width: int,
    window_width: int,
    expected_width: int,
) -> None:
    """
    Test that screenshot width is correctly calculated.

    The width should be:
    - Limited by max_width when custom_width exceeds it
    - Equal to custom_width when it's less than max_width
    - Equal to window_width when custom_width is None
    """
    from superset.commands.report.execute import BaseReportState

    # Mock configuration
    app.config.update(
        {
            "ALERT_REPORTS_MAX_CUSTOM_SCREENSHOT_WIDTH": max_width,
            "WEBDRIVER_WINDOW": {
                "slice": (window_width, 600),
                "dashboard": (window_width, 600),
            },
            "ALERT_REPORTS_EXECUTORS": {},
        }
    )

    # Create report schedule with specified custom width
    report_schedule = create_report_schedule(mocker, custom_width=custom_width)

    # Initialize BaseReportState
    report_state = BaseReportState(
        report_schedule=report_schedule,
        scheduled_dttm=datetime.now(),
        execution_id=UUID("084e7ee6-5557-4ecd-9632-b7f39c9ec524"),
    )

    # Mock security manager and screenshot
    with (
        patch(
            "superset.commands.report.execute.security_manager"
        ) as mock_security_manager,
        patch(
            "superset.utils.screenshots.ChartScreenshot.get_screenshot"
        ) as mock_get_screenshot,
    ):
        # Mock user
        mock_user = mocker.MagicMock()
        mock_security_manager.find_user.return_value = mock_user
        mock_get_screenshot.return_value = b"screenshot bytes"

        # Mock get_executor to avoid database lookups
        with patch(
            "superset.commands.report.execute.get_executor"
        ) as mock_get_executor:
            mock_get_executor.return_value = ("executor", "username")

            # Capture the ChartScreenshot instantiation
            with patch(
                "superset.commands.report.execute.ChartScreenshot",
                wraps=ChartScreenshot,
            ) as mock_chart_screenshot:
                # Call the method that triggers screenshot creation
                report_state._get_screenshots()

                # Verify ChartScreenshot was created with correct window_size
                mock_chart_screenshot.assert_called_once()
                _, kwargs = mock_chart_screenshot.call_args
                assert kwargs["window_size"][0] == expected_width, (
                    f"Test {test_id}: Expected width {expected_width}, "
                    f"but got {kwargs['window_size'][0]}"
                )


def _executor_report_state(mocker: MockerFixture) -> BaseReportState:
    report_schedule = create_report_schedule(mocker)
    # _get_csv_data/_get_embedded_data build a chart-data URL from chart_id
    # before resolving the executor; give it a concrete value so URL building
    # succeeds and the executor resolution is actually reached.
    report_schedule.chart_id = 1
    report_schedule.force_screenshot = False
    return BaseReportState(
        report_schedule=report_schedule,
        scheduled_dttm=datetime.now(),
        execution_id=UUID("084e7ee6-5557-4ecd-9632-b7f39c9ec524"),
    )


@pytest.mark.parametrize(
    "method_name",
    ["_get_screenshots", "_get_csv_data", "_get_embedded_data"],
)
def test_get_content_raises_when_executor_user_missing(
    app: SupersetApp, mocker: MockerFixture, method_name: str
) -> None:
    """
    When the configured executor user cannot be resolved
    (``security_manager.find_user`` returns ``None``), each content path raises a
    dedicated ``ReportScheduleExecutorNotFoundError`` naming the username at the
    resolution boundary, rather than passing ``None`` further into the
    webdriver/auth flow.
    """
    app.config.update(
        {
            "ALERT_REPORTS_MAX_CUSTOM_SCREENSHOT_WIDTH": 1600,
            "WEBDRIVER_WINDOW": {"slice": (800, 600), "dashboard": (800, 600)},
            "ALERT_REPORTS_EXECUTORS": {},
        }
    )
    report_state = _executor_report_state(mocker)

    with (
        patch("superset.commands.report.execute.security_manager") as mock_sm,
        patch("superset.commands.report.execute.get_executor") as mock_get_executor,
        patch("superset.commands.report.execute.machine_auth_provider_factory"),
    ):
        mock_get_executor.return_value = ("executor", "ghost_user")
        mock_sm.find_user = mocker.MagicMock(return_value=None)

        with pytest.raises(ReportScheduleExecutorNotFoundError, match="ghost_user"):
            getattr(report_state, method_name)()


def test_executor_not_found_error_message_without_username() -> None:
    """
    When no username is available, the message falls back to ``(unknown)``
    rather than leaving a double space ("...executor user  was not found.").
    """
    message = str(ReportScheduleExecutorNotFoundError().message)

    assert "(unknown)" in message
    assert "user  was" not in message


def test_executor_not_found_error_status_is_server_error() -> None:
    """
    The executor-not-found error is a 5xx so ``get_logger_from_status`` marks the
    Celery task ``FAILURE`` (a missing executor is a server-side misconfiguration
    that ops task-state alerting must still see), not a 4xx that would log a
    ``WARNING`` and leave the task non-``FAILURE``.
    """
    assert ReportScheduleExecutorNotFoundError().status == 500


def test_resolve_executor_user_returns_user_and_username(
    app: SupersetApp, mocker: MockerFixture
) -> None:
    """
    Happy path: when the executor user exists, the helper returns the
    ``(user, username)`` tuple unchanged — locking the no-behavior-change exit
    criterion for the three call sites.
    """
    from superset.commands.report.execute import resolve_executor_user

    app.config.update({"ALERT_REPORTS_EXECUTORS": {}})
    report_schedule = create_report_schedule(mocker)
    mock_user = mocker.MagicMock()

    with (
        patch("superset.commands.report.execute.security_manager") as mock_sm,
        patch("superset.commands.report.execute.get_executor") as mock_get_executor,
    ):
        mock_get_executor.return_value = ("executor", "real_user")
        mock_sm.find_user = mocker.MagicMock(return_value=mock_user)

        user, username = resolve_executor_user(report_schedule)

    assert user is mock_user
    assert username == "real_user"


def test_update_recipient_to_slack_v2(mocker: MockerFixture):
    """
    Test converting a Slack recipient to Slack v2 format.
    """
    mocker.patch(
        "superset.commands.report.execute.get_channels_with_search",
        return_value=[
            {
                "id": "abc124f",
                "name": "channel-1",
                "is_member": True,
                "is_private": False,
            },
            {
                "id": "blah_!channel_2",
                "name": "Channel_2",
                "is_member": True,
                "is_private": False,
            },
        ],
    )
    mock_report_schedule = ReportSchedule(
        recipients=[
            ReportRecipients(
                type=ReportRecipientType.SLACK,
                recipient_config_json=json.dumps({"target": "Channel-1, Channel_2"}),
            ),
        ],
    )

    mock_cmmd: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    mock_cmmd.update_report_schedule_slack_v2()

    expected_recipient_config = (
        '{"target": "abc124f,blah_!channel_2", "slackV1Target": "Channel-1, Channel_2"}'
    )
    assert (
        mock_cmmd._report_schedule.recipients[0].recipient_config_json
        == expected_recipient_config
    )
    assert mock_cmmd._report_schedule.recipients[0].type == ReportRecipientType.SLACKV2


def test_update_recipient_to_slack_v2_missing_channels(mocker: MockerFixture):
    """
    Test converting a Slack recipient to Slack v2 format raises an error
    in case it can't find all channels.
    """
    mocker.patch(
        "superset.commands.report.execute.get_channels_with_search",
        return_value=[
            {
                "id": "blah_!channel_2",
                "name": "Channel 2",
                "is_member": True,
                "is_private": False,
            },
        ],
    )
    mock_report_schedule = ReportSchedule(
        name="Test Report",
        recipients=[
            ReportRecipients(
                type=ReportRecipientType.SLACK,
                recipient_config_json=json.dumps({"target": "Channel 1, Channel 2"}),
            ),
        ],
    )

    mock_cmmd: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    with pytest.raises(UpdateFailedError):
        mock_cmmd.update_report_schedule_slack_v2()

def test_update_recipient_to_slack_v2_reverts_all_on_partial_failure(
    mocker: MockerFixture,
) -> None:
    """
    When the second of two Slack recipients fails channel resolution, BOTH
    recipients are fully reverted — type AND exact original
    ``recipient_config_json`` string — not just the loop variable's type. This
    prevents the intervening ``create_log`` commit from flushing a half-migrated,
    inconsistent state.
    """

    def channels_side_effect(search_string, types, exact_match):
        if search_string == "Channel-1":
            return [
                {
                    "id": "id_channel_1",
                    "name": "Channel-1",
                    "is_member": True,
                    "is_private": False,
                }
            ]
        # Second recipient: no channel found → length mismatch → UpdateFailedError
        return []

    mocker.patch(
        "superset.commands.report.execute.get_channels_with_search",
        side_effect=channels_side_effect,
    )
    original_config_1 = json.dumps({"target": "Channel-1"})
    original_config_2 = json.dumps({"target": "Channel-2"})
    mock_report_schedule = ReportSchedule(
        name="Test Report",
        recipients=[
            ReportRecipients(
                type=ReportRecipientType.SLACK,
                recipient_config_json=original_config_1,
            ),
            ReportRecipients(
                type=ReportRecipientType.SLACK,
                recipient_config_json=original_config_2,
            ),
        ],
    )

    mock_cmmd = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )

    with pytest.raises(UpdateFailedError):
        mock_cmmd.update_report_schedule_slack_v2()

    first, second = mock_report_schedule.recipients
    # The first recipient was mutated to v2 before the second failed; it must be
    # reverted to its exact original type AND config string.
    assert first.type == ReportRecipientType.SLACK
    assert first.recipient_config_json == original_config_1
    assert second.type == ReportRecipientType.SLACK
    assert second.recipient_config_json == original_config_2


def test_update_recipient_to_slack_v2_pre_iteration_failure(
    mocker: MockerFixture,
) -> None:
    """
    A failure raised while accessing/iterating the recipients (before the loop
    variable is bound) surfaces as ``UpdateFailedError``, not a ``NameError``
    that would mask the real error.
    """

    class _ExplodingRecipients:
        def __iter__(self):
            raise RuntimeError("recipients exploded")

    mock_report_schedule = mocker.MagicMock()
    mock_report_schedule.recipients = _ExplodingRecipients()

    mock_cmmd = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )

    with pytest.raises(UpdateFailedError):
        mock_cmmd.update_report_schedule_slack_v2()


def test_update_recipient_to_slack_v2_no_slack_recipients_is_noop(
    mocker: MockerFixture,
) -> None:
    """
    With no SLACK recipients there is nothing to migrate: the method returns
    without raising and leaves the non-Slack recipients untouched.
    """
    mock_search = mocker.patch(
        "superset.commands.report.execute.get_channels_with_search",
    )
    mock_report_schedule = ReportSchedule(
        recipients=[
            ReportRecipients(
                type=ReportRecipientType.EMAIL,
                recipient_config_json=json.dumps({"target": "user@example.com"}),
            ),
        ],
    )

    mock_cmmd: BaseReportState = BaseReportState(
        mock_report_schedule, "January 1, 2021", "execution_id_example"
    )
    mock_cmmd.update_report_schedule_slack_v2()

    assert mock_cmmd._report_schedule.recipients[0].type == ReportRecipientType.EMAIL
    assert (
        mock_cmmd._report_schedule.recipients[0].recipient_config_json
        == '{"target": "user@example.com"}'
    )
    mock_search.assert_not_called()
