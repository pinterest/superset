import contextlib

from flask import request
from flask_appbuilder import permission_name
from flask_appbuilder.api import expose
from flask_appbuilder.security.decorators import has_access

from superset import event_logger
from superset.constants import MODEL_API_RW_METHOD_PERMISSION_MAP
from superset.superset_typing import FlaskResponse
from superset.utils import json

from .base import BaseSupersetView


class DEXView(BaseSupersetView):
    route_base = "/dex"
    class_permission_name = "DEX"

    method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP

    @expose("/", methods=["GET"])
    @has_access
    @permission_name("read")
    @event_logger.log_this
    def root(self) -> FlaskResponse:
        return self.render_app_template()
