from functools import partial
from typing import Any, List, Optional

from superset.commands.base import BaseCommand
from superset.commands.dataset.exceptions import DatasetNotFoundError
from superset.commands.dataset.template_columns.exceptions import (
    DatasetGetTemplateColumnsError,
)
from superset.connectors.sqla.models import SqlaTable
from superset.daos.dataset import DatasetDAO
from superset.jinja_context import JinjaTemplateProcessor, safe_proxy
from superset.utils.core import DatasourceType
from superset.utils.decorators import on_error, transaction


class TemplateColumnReferencesProcessor(JinjaTemplateProcessor):
    """For extracting column names from a SQL query. Replace the Jinja functions
    with custom ones that only extract column names from the query."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._columns = set()

    def url_param(self, param: str, **kwargs) -> Optional[str]:
        self._columns.add(param)
        return None

    def filter_values(self, column: str, **kwargs) -> list[Any]:
        self._columns.add(column)
        return []

    def get_filters(self, column: str, remove_filter: bool = False) -> list[Any]:
        self._columns.add(column)
        return []

    def set_context(self, **kwargs: Any) -> None:
        super().set_context(**kwargs)
        self._context.update(
            {
                "url_param": partial(safe_proxy, self.url_param),
                "filter_values": partial(safe_proxy, self.filter_values),
                "get_filters": partial(safe_proxy, self.get_filters),
            }
        )

    def extract_column_names(self, sql: str) -> set[str]:
        self.process_template(sql)
        return self._columns


class GetDatasetTemplateColumnsCommand(BaseCommand):
    def __init__(self, dataset_id: int):
        self._dataset_id = dataset_id
        self._dataset: Optional[SqlaTable] = None

    @transaction(on_error=partial(on_error, reraise=DatasetGetTemplateColumnsError))
    def run(self) -> List[str]:
        self.validate()

        # Non-virtual datasets will return an empty list (no template to process)
        if self._dataset.type != DatasourceType.TABLE or not self._dataset.sql:
            return []

        dataset_columns = {col.column_name for col in self._dataset.columns}
        template_columns = TemplateColumnReferencesProcessor(
            self._dataset.database,
            table=self._dataset,
        ).extract_column_names(self._dataset.sql)
        return list(template_columns - dataset_columns)

    def validate(self) -> None:
        self._dataset = DatasetDAO.find_by_id(self._dataset_id)
        if not self._dataset:
            raise DatasetNotFoundError()
