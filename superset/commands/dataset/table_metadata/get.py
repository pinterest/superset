from functools import partial
from typing import cast, Optional

from superset import app
from superset.commands.base import BaseCommand
from superset.commands.dataset.exceptions import DatasetNotFoundError
from superset.commands.dataset.table_metadata.exceptions import (
    DatasetGetTableMetadataError,
)
from superset.connectors.sqla.models import SqlaTable
from superset.daos.database import DatabaseDAO
from superset.daos.dataset import DatasetDAO
from superset.models.core import Database
from superset.pinterest.types import (
    DatasetTableMetadata,
    TableMetadata,
    TableMetadataField,
)
from superset.sql.parse import Table
from superset.sql_parse import extract_tables_from_jinja_sql
from superset.utils.decorators import on_error, transaction

config = app.config

DB_TABLE_METADATA = config["DB_TABLE_METADATA"]


class GetDatasetTableMetadataCommand(BaseCommand):
    def __init__(self, dataset_id: int):
        self._dataset_id = dataset_id
        self._dataset: Optional[SqlaTable] = None
        self._database: Optional[Database] = None

    def _get_dataset_tables(self) -> set[Table]:
        """
        Get the tables referenced in the dataset SQL.
        """
        assert self._dataset is not None
        assert self._database is not None

        if self._dataset.sql:
            return extract_tables_from_jinja_sql(self._dataset.sql, self._database)
        return {
            Table(self._dataset.table_name, self._dataset.schema, self._dataset.schema)
        }

    @transaction(on_error=partial(on_error, reraise=DatasetGetTableMetadataError))
    def run(self) -> DatasetTableMetadata:
        self.validate()
        assert self._database is not None
        dataset_tables = self._get_dataset_tables()
        database_name = self._database.database_name
        table_metadata: list[TableMetadata] = []
        for table in dataset_tables:
            if table.schema:
                table_name = f"{table.schema}.{table.table}"
            else:
                table_name = table.table
            metadata_fields = (
                cast(
                    list[TableMetadataField],
                    DB_TABLE_METADATA(self._database, table.schema, table.table),
                )
                if DB_TABLE_METADATA
                else None
            )
            table_metadata.append(
                cast(
                    TableMetadata,
                    {
                        "table_name": table_name,
                        "metadata_fields": metadata_fields,
                    },
                )
            )
        return {
            "database_name": database_name,
            "table_metadata": table_metadata,
        }

    def validate(self) -> None:
        self._dataset = DatasetDAO.find_by_id(self._dataset_id)
        if not self._dataset:
            raise DatasetNotFoundError()
        self._database = DatabaseDAO.find_by_id(self._dataset.database_id)
        if not self._database:
            raise DatasetGetTableMetadataError(
                f"Database with id {self._dataset.database_id} not found"
            )
