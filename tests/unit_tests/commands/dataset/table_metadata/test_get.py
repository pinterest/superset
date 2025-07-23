from unittest import mock
from unittest.mock import MagicMock

from superset.commands.dataset.exceptions import DatasetNotFoundError
from superset.commands.dataset.table_metadata.exceptions import (
    DatasetGetTableMetadataError,
)
from superset.commands.dataset.table_metadata.get import GetDatasetTableMetadataCommand
from superset.sql.parse import Table
from superset import app
from tests.integration_tests.base_tests import SupersetTestCase

def mock_db_table_metadata(database, schema, table):
    """
    Mock function to simulate DB_TABLE_METADATA behavior.
    """
    return [
        {
            "key": "columns",
            "value": "column_1, column_2",
            "type": "string",
        },
        {
            "key": "table_name",
            "value": table,
            "type": "string",
        },
        {
            "key": "schema",
            "value": schema,
            "type": "string",
        },
    ]

class TestGetDatasetTableMetadataCommand(SupersetTestCase):
    def setUp(self):
        self.mock_dataset_find_by_id = mock.patch(
            "superset.daos.dataset.DatasetDAO.find_by_id"
        ).start()
        self.mock_database_find_by_id = mock.patch(
            "superset.daos.database.DatabaseDAO.find_by_id"
        ).start()
        self.mock_dataset_find_by_id.return_value = MagicMock()
        self.mock_database_find_by_id.return_value = MagicMock()
        self.mock_extract_tables = mock.patch(
            "superset.commands.dataset.table_metadata.get.extract_tables_from_jinja_sql"
        ).start()
        self.addCleanup(mock.patch.stopall)

    def test_validate_dataset_not_found(self):
        with self.assertRaises(DatasetNotFoundError):
            self.mock_dataset_find_by_id.return_value = None
            GetDatasetTableMetadataCommand(1).validate()

    def test_validate_database_not_found(self):
        with self.assertRaises(DatasetGetTableMetadataError):
            self.mock_dataset_find_by_id.return_value = MagicMock()
            self.mock_database_find_by_id.return_value = None
            GetDatasetTableMetadataCommand(1).validate()

    def test_validate_found(self):
        self.mock_dataset_find_by_id.return_value = MagicMock(id=2)
        self.mock_database_find_by_id.return_value = MagicMock(id=3)
        command = GetDatasetTableMetadataCommand(1)
        command.validate()
        assert command._dataset.id == 2
        assert command._database.id == 3

    def test_no_tables_returned(self):
        self.mock_extract_tables.return_value = set()
        self.mock_dataset_find_by_id.return_value = MagicMock(
            sql="SELECT *", table_name=None, schema=None
        )
        self.mock_database_find_by_id.return_value = MagicMock(
            database_name="test_db"
        )
        result = GetDatasetTableMetadataCommand(1).run()
        assert result == {
            "database_name": "test_db",
            "table_metadata": [],
        }


    def test_schema_name_not_available(self):
        self.mock_extract_tables.return_value = {
            Table(
                table="table_1", schema=None
            )
        }
        self.mock_dataset_find_by_id.return_value = MagicMock(
            sql="SELECT * FROM table_1", table_name=None, schema=None
        )
        self.mock_database_find_by_id.return_value = MagicMock(
            database_name="test_db"
        )
        result = GetDatasetTableMetadataCommand(1).run()
        assert result == {
            "database_name": "test_db",
            "table_metadata": [
                {
                    "table_name": "table_1",
                    "metadata_fields": None,
                }
            ],
        }

    def test_schema_name_returnedc(self):
        self.mock_extract_tables.return_value = {
            Table(
                table="table_1", schema="schema_a"
            )
        }
        self.mock_dataset_find_by_id.return_value = MagicMock(
            sql="SELECT * FROM table_1", table_name=None, schema=None
        )
        self.mock_database_find_by_id.return_value = MagicMock(
            database_name="test_db"
        )
        result = GetDatasetTableMetadataCommand(1).run()
        assert result == {
            "database_name": "test_db",
            "table_metadata": [
                {
                    "table_name": "schema_a.table_1",
                    "metadata_fields": None,
                }
            ],
        }


    @mock.patch(
        "superset.commands.dataset.table_metadata.get.DB_TABLE_METADATA",
        mock_db_table_metadata,
    ) 
    def test_with_db_table_metadata_config(self):
        self.mock_extract_tables.return_value = {
            Table(
                table="table_1", schema="schema_a"
            )
        }
        # self.mock_database_find_by_id.database_name = "test_db"
        self.mock_database_find_by_id.return_value = MagicMock(
            database_name="test_db"
        )
        result = GetDatasetTableMetadataCommand(1).run()
        assert result == {
            "database_name": "test_db",
            "table_metadata": [
                {
                    "table_name": "schema_a.table_1",
                    "metadata_fields": [
                        {
                            "key": "columns",
                            "value": "column_1, column_2",
                            "type": "string",
                        },
                        {
                            "key": "table_name",
                            "value": "table_1",
                            "type": "string",
                        },
                        {
                            "key": "schema",
                            "value": "schema_a",
                            "type": "string",
                        },
                    ]
                },
            ],
        }

    def test__get_dataset_tables_virtual_dataset(self):
        self.mock_dataset_find_by_id.return_value = MagicMock(
            sql="SELECT * FROM table_1",
            table_name=None,
            schema=None,
        )
        self.mock_extract_tables.return_value = {
            Table(
                table="table_1", schema=None
            )
        }
        command = GetDatasetTableMetadataCommand(1)
        command.validate()
        tables = command._get_dataset_tables()
        assert self.mock_extract_tables.call_count == 1
        assert tables == {
            Table(
                table="table_1", schema=None
            )
        }



    def test__get_dataset_tables_physical_dataset(self):
        self.mock_dataset_find_by_id.return_value = MagicMock(
            sql=None,
            table_name="tablea",
            schema="schemaa",
        )
        command = GetDatasetTableMetadataCommand(1)
        command.validate()
        tables = command._get_dataset_tables()
        assert self.mock_extract_tables.call_count == 0
        assert tables == {
            Table(
                table="tablea", schema="schemaa", catalog="schemaa"
            )
        }