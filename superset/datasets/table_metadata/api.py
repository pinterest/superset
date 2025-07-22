import logging

from flask import Response, request
from flask_appbuilder.api import expose, protect, safe
from flask_appbuilder.models.sqla.interface import SQLAInterface

from superset.commands.dataset.exceptions import DatasetNotFoundError
from superset.commands.dataset.table_metadata.exceptions import (
    DatasetGetTableMetadataError,
)
from superset.connectors.sqla.models import TableColumn
from superset.constants import MODEL_API_RW_METHOD_PERMISSION_MAP
from superset.datasets.schemas import DatasetTableMetadataResponseSchema
from superset.views.base_api import BaseSupersetModelRestApi, statsd_metrics
from superset.commands.dataset.table_metadata.get import (
    GetDatasetTableMetadataCommand,
)
logger = logging.getLogger(__name__)


class DatasetTableMetadataRestApi(BaseSupersetModelRestApi):
  datamodel = SQLAInterface(TableColumn)
  include_route_methods = {"table_metadata"}
  class_permission_name = "Dataset"
  method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP

  resource_name = "dataset"
  allow_browser_login = True

  openapi_spec_tag = "Datasets"
  openapi_spec_component_schemas = (DatasetTableMetadataResponseSchema,)

  @expose("/<int:pk>/table_metadata", methods=("GET",))
  @protect()
  @safe
  @statsd_metrics
  def table_metadata(self, pk: int) -> Response:
    """Extract all columns referenced in jinja templates for virtual datasets.
    ---
    get:
      summary: Get dataset table metadata
      parameters:
      - in: path
        name: pk
        schema:
          type: integer
      responses:
        200:
          description: Dataset table metadata result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DatasetTableMetadataResponseSchema"
        404:
          $ref: '#/components/responses/404'
        422:
          $ref: '#/components/responses/422'
        500:
          $ref: '#/components/responses/500'
    """
    try:
      table_metadata = GetDatasetTableMetadataCommand(pk).run()
      return self.response(200, result=table_metadata)
    except DatasetNotFoundError:
      return self.response_404()
    except DatasetGetTableMetadataError as ex:
      logger.error(
          "Error getting dataset table metadata %s: %s",
          self.__class__.__name__,
          str(ex),
          exc_info=True,
      )
      return self.response_422(message=str(ex))
