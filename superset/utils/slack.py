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

import logging
import time
from typing import Optional

from flask import current_app
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from superset import feature_flag_manager
from superset.exceptions import SupersetException
from superset.extensions import cache_manager
from superset.reports.schemas import SlackChannelSchema
from superset.utils import cache as cache_util
from superset.utils.backports import StrEnum

logger = logging.getLogger(__name__)

SLACK_CHANNELS_CACHE_TIMEOUT = 60 * 60 * 24 * 2  # 2 days


class SlackChannelTypes(StrEnum):
    PUBLIC = "public_channel"
    PRIVATE = "private_channel"


class SlackClientError(Exception):
    pass


def get_slack_client() -> WebClient:
    token: str = current_app.config["SLACK_API_TOKEN"]
    if callable(token):
        token = token()
    return WebClient(token=token, proxy=current_app.config["SLACK_PROXY"])


@cache_util.memoized_func(
    key="slack_conversations_list",
    cache=cache_manager.cache,
)
def get_channels(
    types: Optional[list[SlackChannelTypes]] = None, limit: int = 999
) -> list[SlackChannelSchema]:
    client = get_slack_client()
    channels = []
    cursor = None
    extra_params = {}
    extra_params["types"] = ",".join(types) if types else None
    while True:
        try:
            response = client.conversations_list(
                limit=limit, cursor=cursor, exclude_archived=True, **extra_params
            )
        except SlackApiError as ex:
            # Check if this is a rate limit error (429)
            # ex.response may be a SlackResponse object or just a string
            # Slack may surface rate limit errors as
            # HTTP 429 or {'ok': False, 'error': 'ratelimited'}.
            status_code = getattr(ex.response, "status_code", None)
            error_code = None

            if hasattr(ex.response, "get"):
                error_code = ex.response.get("error")

            if status_code == 429 or error_code == "ratelimited":
                headers = getattr(ex.response, "headers", {}) or {}
                retry_after = int(headers.get("retry-after", 30))

                logger.warning(
                    "Slack API rate limited. Retrying after %d seconds",
                    retry_after,
                )

                wait_time = retry_after + 1
                time.sleep(wait_time)
                continue
            # Re-raise non-rate-limit errors
            raise
        channels.extend(response.data["channels"])
        cursor = response.data.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break
    return channels


def get_channels_with_search(
    search_string: str = "",
    limit: int = 999,
    types: Optional[list[SlackChannelTypes]] = None,
    exact_match: bool = False,
) -> list[SlackChannelSchema]:
    """
    The slack api is paginated but does not include search, so we need to fetch
    all channels and filter them ourselves
    This will search by slack name or id
    """

    try:
        channels = get_channels(
            types=types, limit=limit, cache_timeout=SLACK_CHANNELS_CACHE_TIMEOUT
        )
        # The search string can be multiple channels separated by commas
        if search_string:
            search_array = [
                search.lower().strip("#")
                for search in (search_string.split(",") if search_string else [])
            ]

            channels = [
                channel
                for channel in channels
                if any(
                    (
                        search.lower() == channel["name"].lower()
                        or search.lower() == channel["id"].lower()
                        if exact_match
                        else (
                            search.lower() in channel["name"].lower()
                            or search.lower() in channel["id"].lower()
                        )
                    )
                    for search in search_array
                )
            ]
        return channels
    except (SlackClientError, SlackApiError) as ex:
        raise SupersetException(f"Failed to list channels: {ex}") from ex


def should_use_v2_api() -> bool:
    if not feature_flag_manager.is_feature_enabled("ALERT_REPORT_SLACK_V2"):
        return False
    try:
        client = get_slack_client()
        client.conversations_list()
        logger.info("Slack API v2 is available")
        return True
    except SlackApiError:
        # use the v1 api but warn with a deprecation message
        logger.warning(
            """Your current Slack scopes are missing `channels:read`. Please add
            this to your Slack app in order to continue using the v1 API. Support
            for the old Slack API will be removed in Superset version 6.0.0."""
        )
        return False


def get_user_avatar(email: str, client: WebClient = None) -> str:
    client = client or get_slack_client()
    try:
        response = client.users_lookupByEmail(email=email)
    except Exception as ex:
        raise SlackClientError(f"Failed to lookup user by email: {email}") from ex

    user = response.data.get("user")
    if user is None:
        raise SlackClientError("No user found with that email.")

    profile = user.get("profile")
    if profile is None:
        raise SlackClientError("User found but no profile available.")

    avatar_url = profile.get("image_192")
    if avatar_url is None:
        raise SlackClientError("Profile image is not available.")

    return avatar_url
