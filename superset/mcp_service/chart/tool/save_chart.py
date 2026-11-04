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
MCP tool: save_chart

Saves a chart from the cached form_data of a preview, so the saved chart is
exactly what the user reviewed.
"""

import logging
from typing import Any, Dict

from fastmcp import Context
from superset_core.mcp.decorators import tool, ToolAnnotations

from superset.commands.exceptions import CommandException
from superset.exceptions import SupersetException
from superset.extensions import event_logger
from superset.mcp_service.auth import has_dataset_access
from superset.mcp_service.chart.schemas import (
    SaveChartRequest,
    SaveChartResponse,
    serialize_chart_object,
)
from superset.mcp_service.utils.url_utils import get_superset_base_url
from superset.utils import json

logger = logging.getLogger(__name__)


def _load_preview_form_data(form_data_key: str) -> Dict[str, Any] | None:
    """Return the form_data cached under *form_data_key*, or None if missing."""
    from superset.commands.explore.form_data.get import GetFormDataCommand
    from superset.commands.explore.form_data.parameters import CommandParameters

    try:
        cached = GetFormDataCommand(CommandParameters(key=form_data_key)).run()
    except (KeyError, ValueError, CommandException) as ex:
        logger.warning("Failed to retrieve form_data from cache: %s", ex)
        return None
    return json.loads(cached) if cached else None


@tool(
    tags=["mutate"],
    class_permission_name="Chart",
    annotations=ToolAnnotations(
        title="Save chart",
        readOnlyHint=False,
        destructiveHint=False,
    ),
)
async def save_chart(request: SaveChartRequest, ctx: Context) -> SaveChartResponse:
    """Save a previewed chart permanently, exactly as it was previewed.

    Order of operations:
    1. Preview the chart with generate_chart (save_chart=False) or
       update_chart_preview and show the user the returned explore URL.
    2. Wait for the user to approve the preview.
    3. Call save_chart with that preview's form_data_key.

    The chart is rebuilt from the cached preview configuration, so what is
    saved cannot drift from what the user saw. A missing or expired
    form_data_key is refused; preview the chart again to get a new one.

    Returns the saved chart and its URL, or an error.
    """
    await ctx.info(
        "Saving chart from preview: form_data_key=%s" % request.form_data_key
    )

    form_data = _load_preview_form_data(request.form_data_key)
    if not form_data or not form_data.get("viz_type"):
        return SaveChartResponse(
            error=(
                f"No chart preview found for form_data_key '{request.form_data_key}'. "
                "It may have expired; preview the chart again."
            )
        )

    from superset.daos.dataset import DatasetDAO
    from superset.views.utils import get_datasource_info

    try:
        datasource_id, datasource_type = get_datasource_info(None, None, form_data)
    except SupersetException as ex:
        return SaveChartResponse(error=str(ex))

    dataset = (
        DatasetDAO.find_by_id(datasource_id) if datasource_type == "table" else None
    )
    if not dataset or not has_dataset_access(dataset):
        return SaveChartResponse(
            error=f"Dataset {datasource_id} for this preview was not found."
        )

    chart_name = (
        request.chart_name
        or form_data.get("slice_name")
        or f"{form_data['viz_type']} - {dataset.table_name}"
    )

    from superset.commands.chart.create import CreateChartCommand

    try:
        with event_logger.log_context(action="mcp.save_chart.db_write"):
            chart = CreateChartCommand(
                {
                    "slice_name": chart_name,
                    "viz_type": form_data["viz_type"],
                    "datasource_id": dataset.id,
                    "datasource_type": "table",
                    "params": json.dumps(form_data),
                }
            ).run()
    except CommandException as ex:
        await ctx.error("Chart save failed: %s" % (ex,))
        return SaveChartResponse(error=f"Chart could not be saved: {ex}")

    await ctx.info("Chart saved: chart_id=%s" % chart.id)
    return SaveChartResponse(
        chart=serialize_chart_object(chart),
        chart_url=f"{get_superset_base_url()}/explore/?slice_id={chart.id}",
        success=True,
    )
