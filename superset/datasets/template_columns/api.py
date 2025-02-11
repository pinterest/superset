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

from flask import Response
from flask_appbuilder.api import expose, protect, safe
from flask_appbuilder.models.sqla.interface import SQLAInterface

from superset.commands.dataset.exceptions import DatasetNotFoundError
from superset.commands.dataset.template_columns.exceptions import (
    DatasetGetTemplateColumnsError,
)
from superset.commands.dataset.template_columns.get import (
    GetDatasetTemplateColumnsCommand,
)
from superset.connectors.sqla.models import TableColumn
from superset.constants import MODEL_API_RW_METHOD_PERMISSION_MAP
from superset.views.base_api import BaseSupersetModelRestApi, statsd_metrics

logger = logging.getLogger(__name__)


class DatasetTemplateColumnsRestApi(BaseSupersetModelRestApi):
    datamodel = SQLAInterface(TableColumn)

    include_route_methods = {"template_columns"}
    class_permission_name = "Dataset"
    method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP

    resource_name = "dataset"
    allow_browser_login = True

    openapi_spec_tag = "Datasets"

    @expose("/<int:pk>/template_columns", methods=("GET",))
    @protect()
    @safe
    @statsd_metrics
    def template_columns(self, pk: int) -> Response:
        """Extract all columns referenced in jinja templates for virtual datasets.
        ---
        get:
          summary: Get template columns for a dataset
          parameters:
          - in: path
            name: pk
            schema:
              type: integer
          responses:
            200:
            200:
              description: Query result
              content:
                application/json:
                  schema:
                    $ref: "#/components/schemas/DatasetTemplateColumnsResponseSchema"
            404:
              $ref: '#/components/responses/404'
            422:
              $ref: '#/components/responses/422'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            columns = GetDatasetTemplateColumnsCommand(pk).run()
            return self.response(200, columns=columns)
        except DatasetNotFoundError:
            return self.response_404()
        except DatasetGetTemplateColumnsError as ex:
            logger.error(
                "Error getting dataset template column %s: %s",
                self.__class__.__name__,
                str(ex),
                exc_info=True,
            )
            return self.response_422(message=str(ex))
