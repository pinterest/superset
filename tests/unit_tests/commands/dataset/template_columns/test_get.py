from unittest import mock
from unittest.mock import MagicMock

from sqlalchemy.dialects.mysql import dialect

from superset.commands.dataset.exceptions import DatasetNotFoundError
from superset.commands.dataset.template_columns.get import (
    GetDatasetTemplateColumnsCommand,
    TemplateColumnReferencesProcessor,
)
from tests.integration_tests.base_tests import SupersetTestCase


class TestTemplateColumnReferencesProcessor(SupersetTestCase):
    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_db.get_dialect = MagicMock(return_value=dialect())
        mock_table = MagicMock()
        self.processor = TemplateColumnReferencesProcessor(
            self.mock_db, table=mock_table
        )

    def test_extract_columns_with_filter_values(self):
        sql = "SELECT name, count(*) FROM birth_names WHERE country = {{ filter_values('country', 'US')[0] }} GROUP BY name"
        assert self.processor.extract_column_names(sql) == {"country"}

    def test_extract_columns_with_get_filters(self):
        sql = """
            SELECT name, count(*)
            FROM birth_names
            WHERE 0=1
            {% for filter in get_filters('country') %}
                OR country = {{ filter }}
            {% endfor %}
        """
        assert self.processor.extract_column_names(sql) == {"country"}

    def test_extract_columns_with_mult_functions(self):
        sql = """
            SELECT name, count(*)
            FROM birth_names
            WHERE gender = {{ filter_values('gender')[0] }}
            AND (
                0=1
                {% for filter in get_filters('country') %}
                OR country = {{ filter }}
                {% endfor %}
            )
        """
        assert self.processor.extract_column_names(sql) == {"country", "gender"}

    def test_extract_columns_with_no_functions(self):
        sql = "SELECT * FROM birth_names"
        assert self.processor.extract_column_names(sql) == set()


class TestGetDatasetTemplateColumnsCommand(SupersetTestCase):
    @mock.patch("superset.daos.dataset.DatasetDAO.find_by_id")
    def test_validate_dataset_not_found(self, mock_dataset_find_by_id):
        with self.assertRaises(DatasetNotFoundError):
            mock_dataset_find_by_id.return_value = None
            GetDatasetTemplateColumnsCommand(1).validate()

    @mock.patch("superset.daos.dataset.DatasetDAO.find_by_id")
    def test_validate_dataset_found(self, mock_dataset_find_by_id):
        mock_dataset = MagicMock()
        mock_dataset_find_by_id.return_value = mock_dataset
        GetDatasetTemplateColumnsCommand(1).validate()

    @mock.patch("superset.daos.dataset.DatasetDAO.find_by_id")
    @mock.patch(
        "superset.commands.dataset.template_columns.get.TemplateColumnReferencesProcessor"
    )
    def test_physical_dataset_no_template_columns(
        self, mock_template_columns_processor, mock_dataset_find_by_id
    ):
        mock_dataset_find_by_id.return_value = MagicMock(type="table", sql=None)
        assert GetDatasetTemplateColumnsCommand(1).run() == []
        mock_template_columns_processor.assert_not_called()

    @mock.patch("superset.daos.dataset.DatasetDAO.find_by_id")
    @mock.patch(
        "superset.commands.dataset.template_columns.get.TemplateColumnReferencesProcessor"
    )
    def test_physical_dataset_columns_not_included(
        self, mock_template_columns_processor, mock_dataset_find_by_id
    ):
        mock_db = MagicMock()
        mock_db.get_dialect = MagicMock(return_value=dialect())
        mock_dataset = MagicMock(
            type="table",
            sql="SELECT bar, baz FROM foo WHERE bar = {{filter_values('bar')[0]}}",
            database=mock_db,
            columns=[MagicMock(column_name="bar"), MagicMock(column_name="baz")],
        )
        mock_dataset_find_by_id.return_value = mock_dataset
        assert GetDatasetTemplateColumnsCommand(1).run() == []
        mock_template_columns_processor.assert_called_once_with(
            mock_db, table=mock_dataset
        )

    @mock.patch("superset.daos.dataset.DatasetDAO.find_by_id")
    def test_physical_dataset_template_columns_returned(self, mock_dataset_find_by_id):
        mock_db = MagicMock()
        mock_db.get_dialect = MagicMock(return_value=dialect())
        mock_dataset = MagicMock(
            type="table",
            sql="SELECT baz FROM foo WHERE bar = {{filter_values('bar')[0]}}",
            database=mock_db,
            columns=[MagicMock(column_name="baz")],
        )
        mock_dataset_find_by_id.return_value = mock_dataset
        assert GetDatasetTemplateColumnsCommand(1).run() == ["bar"]
