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
Per-request overrides applied to chart query objects: paging and time range.
"""

from typing import Any

from superset.mcp_service.chart.schemas import ChartDataPagination

TEMPORAL_RANGE = "TEMPORAL_RANGE"


def apply_time_range(query: dict[str, Any], time_range: str) -> bool:
    """Set *time_range* on the time filters of a query object dict.

    Handles legacy ``granularity`` queries and ``TEMPORAL_RANGE`` entries in
    ``filters`` (saved query contexts). Queries built from form_data carry the
    chart's time filter only as a ``TEMPORAL_RANGE`` adhoc filter, which query
    objects ignore, so it is added to ``filters`` with the new range. Returns
    False if the query has no time filter to apply it to.
    """
    if query.get("granularity"):
        query["time_range"] = time_range
        return True

    filters = query.setdefault("filters", [])
    temporal = [f for f in filters if f.get("op") == TEMPORAL_RANGE]
    for query_filter in temporal:
        query_filter["val"] = time_range
    if temporal:
        return True

    for adhoc_filter in query.get("adhoc_filters") or []:
        if adhoc_filter.get("operator") == TEMPORAL_RANGE and adhoc_filter.get(
            "subject"
        ):
            filters.append(
                {
                    "col": adhoc_filter["subject"],
                    "op": TEMPORAL_RANGE,
                    "val": time_range,
                }
            )
    return any(f.get("op") == TEMPORAL_RANGE for f in filters)


def apply_query_overrides(
    query: dict[str, Any],
    limit: int | None = None,
    offset: int | None = None,
    time_range: str | None = None,
) -> None:
    """Apply request-level paging and time range to a query object dict.

    :raises ValueError: if *time_range* is given but the query has no time filter
    """
    if limit:
        query["row_limit"] = limit
    if offset:
        query["row_offset"] = offset
    if time_range and not apply_time_range(query, time_range):
        raise ValueError(
            "time_range cannot be applied: the chart has no time range filter. "
            "Add a time range filter to the chart in Superset, or omit time_range."
        )


def build_pagination(
    limit: int | None, offset: int | None, row_count: int
) -> ChartDataPagination | None:
    """Describe the returned page, or None when the request did not page."""
    if limit is None and offset is None:
        return None
    returned = min(row_count, limit) if limit else row_count
    return ChartDataPagination(
        offset=offset or 0,
        limit=limit,
        returned=returned,
        has_more=bool(limit) and returned >= limit,
    )
