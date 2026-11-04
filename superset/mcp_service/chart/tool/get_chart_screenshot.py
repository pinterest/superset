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

"""
MCP tool: get_chart_screenshot

Renders a saved chart in the pooled headless browser and returns it as a PNG.
"""

from typing import Any

from fastmcp.exceptions import ToolError
from fastmcp.utilities.types import Image
from flask import current_app, g
from superset_core.mcp.decorators import tool, ToolAnnotations

from superset.extensions import event_logger
from superset.mcp_service.chart.chart_utils import validate_chart_dataset
from superset.mcp_service.chart.schemas import GetChartScreenshotRequest
from superset.mcp_service.mcp_config import MCP_CHART_SCREENSHOT_MAX_BYTES


def _find_chart(identifier: int | str) -> Any | None:
    """Find a chart the user can access by numeric ID or UUID."""
    from superset.daos.chart import ChartDAO

    if isinstance(identifier, int) or identifier.isdigit():
        return ChartDAO.find_by_id(int(identifier))
    return ChartDAO.find_by_id(identifier, id_column="uuid")


@tool(
    tags=["data"],
    class_permission_name="Chart",
    annotations=ToolAnnotations(
        title="Get chart screenshot",
        readOnlyHint=True,
        destructiveHint=False,
    ),
)
def get_chart_screenshot(request: GetChartScreenshotRequest) -> Image:
    """Return a PNG screenshot of a saved chart.

    Use this to show or describe what a saved chart looks like. Charts are
    rendered in a headless browser, which can take several seconds. For the
    chart's underlying numbers use get_chart_data instead.
    """
    chart = _find_chart(request.identifier)
    if not chart:
        raise ToolError(f"Chart not found: {request.identifier}")

    validation = validate_chart_dataset(chart, check_access=True)
    if not validation.is_valid:
        raise ToolError(validation.error or "Chart's dataset is not accessible")

    from superset.mcp_service.screenshot.pooled_screenshot import (
        PooledChartScreenshot,
    )
    from superset.utils.urls import get_url_path

    window_size = (request.width, request.height)
    screenshot = PooledChartScreenshot(
        get_url_path("Superset.slice", slice_id=chart.id),
        chart.digest,
        window_size=window_size,
    )
    with event_logger.log_context(action="mcp.get_chart_screenshot.render"):
        png = screenshot.get_screenshot(g.user, window_size)

    if not png:
        raise ToolError(f"Chart {chart.id} could not be rendered")

    max_bytes = current_app.config.get(
        "MCP_CHART_SCREENSHOT_MAX_BYTES", MCP_CHART_SCREENSHOT_MAX_BYTES
    )
    if len(png) > max_bytes:
        raise ToolError(
            f"Chart {chart.id} screenshot is {len(png)} bytes, over the "
            f"{max_bytes}-byte limit; request a smaller width and height"
        )

    return Image(data=png, format="png")
