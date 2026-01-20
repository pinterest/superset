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

# pylint: disable=import-outside-toplevel

from __future__ import annotations

from contextlib import contextmanager
from typing import TYPE_CHECKING
from unittest.mock import patch

import pytest
from pytest_mock import MockerFixture
from sqlalchemy import create_engine, text
from sqlalchemy.orm.session import Session
from sqlalchemy.pool import StaticPool
from superset.connectors.sqla.models import SqlaTable, TableColumn
from superset.extensions import cache_manager
from tests.unit_tests.conftest import with_feature_flags

if TYPE_CHECKING:
    from superset.models.core import Database


@pytest.fixture
def database(mocker: MockerFixture, session: Session) -> Database:
    from superset.connectors.sqla.models import SqlaTable
    from superset.models.core import Database

    SqlaTable.metadata.create_all(session.get_bind())

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    database = Database(database_name="db", sqlalchemy_uri="sqlite://")

    connection = engine.raw_connection()
    connection.execute("CREATE TABLE t (a INTEGER, b TEXT)")
    connection.execute("INSERT INTO t VALUES (1, 'Alice')")
    connection.execute("INSERT INTO t VALUES (NULL, 'Bob')")
    connection.commit()

    # since we're using an in-memory SQLite database, make sure we always
    # return the same engine where the table was created
    @contextmanager
    def mock_get_sqla_engine():
        yield engine

    mocker.patch.object(
        database,
        "get_sqla_engine",
        new=mock_get_sqla_engine,
    )

    return database


def test_values_for_column(database: Database) -> None:
    """
    Test the `values_for_column` method.

    NULL values should be returned as `None`, not `np.nan`, since NaN cannot be
    serialized to JSON.
    """
    from superset.connectors.sqla.models import SqlaTable, TableColumn

    table = SqlaTable(
        database=database,
        schema=None,
        table_name="t",
        columns=[TableColumn(column_name="a")],
    )
    assert table.values_for_column("a") == [1, None]


def test_values_for_column_with_rls(database: Database) -> None:
    """
    Test the `values_for_column` method with RLS enabled.
    """
    from sqlalchemy.sql.elements import TextClause

    from superset.connectors.sqla.models import SqlaTable, TableColumn

    table = SqlaTable(
        database=database,
        schema=None,
        table_name="t",
        columns=[
            TableColumn(column_name="a"),
        ],
    )
    with patch.object(
        table,
        "get_sqla_row_level_filters",
        return_value=[
            TextClause("a = 1"),
        ],
    ):
        assert table.values_for_column("a") == [1]


def test_values_for_column_with_rls_no_values(database: Database) -> None:
    """
    Test the `values_for_column` method with RLS enabled and no values.
    """
    from sqlalchemy.sql.elements import TextClause

    from superset.connectors.sqla.models import SqlaTable, TableColumn

    table = SqlaTable(
        database=database,
        schema=None,
        table_name="t",
        columns=[
            TableColumn(column_name="a"),
        ],
    )
    with patch.object(
        table,
        "get_sqla_row_level_filters",
        return_value=[
            TextClause("a = 2"),
        ],
    ):
        assert table.values_for_column("a") == []


def test_values_for_column_calculated(
    mocker: MockerFixture,
    database: Database,
) -> None:
    """
    Test that calculated columns work.
    """
    from superset.connectors.sqla.models import SqlaTable, TableColumn

    table = SqlaTable(
        database=database,
        schema=None,
        table_name="t",
        columns=[
            TableColumn(
                column_name="starts_with_A",
                expression="CASE WHEN b LIKE 'A%' THEN 'yes' ELSE 'nope' END",
            )
        ],
    )
    assert table.values_for_column("starts_with_A") == ["yes", "nope"]


def test_values_for_column_double_percents(
    mocker: MockerFixture,
    database: Database,
) -> None:
    """
    Test the behavior of `double_percents`.
    """
    from superset.connectors.sqla.models import SqlaTable, TableColumn

    with database.get_sqla_engine() as engine:
        engine.dialect.identifier_preparer._double_percents = "pyformat"

    table = SqlaTable(
        database=database,
        schema=None,
        table_name="t",
        columns=[
            TableColumn(
                column_name="starts_with_A",
                expression="CASE WHEN b LIKE 'A%' THEN 'yes' ELSE 'nope' END",
            )
        ],
    )

    mutate_sql_based_on_config = mocker.patch.object(
        database,
        "mutate_sql_based_on_config",
        side_effect=lambda sql: sql,
    )
    pd = mocker.patch("superset.models.helpers.pd")

    table.values_for_column("starts_with_A")

    # make sure the SQL originally had double percents
    mutate_sql_based_on_config.assert_called_with(
        "SELECT DISTINCT CASE WHEN b LIKE 'A%%' THEN 'yes' ELSE 'nope' END "
        "AS column_values \nFROM t\n LIMIT 10000 OFFSET 0"
    )
    # make sure final query has single percents
    with database.get_sqla_engine() as engine:
        expected_sql = text(
            "SELECT DISTINCT CASE WHEN b LIKE 'A%' THEN 'yes' ELSE 'nope' END "
            "AS column_values \nFROM t\n LIMIT 10000 OFFSET 0"
        )
        called_sql = pd.read_sql_query.call_args.kwargs["sql"]
        called_conn = pd.read_sql_query.call_args.kwargs["con"]

        assert called_sql.compare(expected_sql) is True
        assert called_conn == engine


@with_feature_flags(ENABLE_COLUMN_VALUES_CACHE=False)
def test_values_for_column_enable_cache_false(
    mocker: MockerFixture,
    database: Database,
) -> None:
    """
    Test that column values are not cached when the feature flag is disabled.
    """
    mock_cache = mocker.MagicMock()
    mocker.patch.object(
        cache_manager,
        "_explore_form_data_cache",
        mock_cache,
    )
    mock_cache.get.return_value = None
    table = SqlaTable(
        database=database,
        schema=None,
        table_name="t",
        columns=[TableColumn(column_name="a")],
    )
    table.values_for_column("a", use_cache=True)
    mock_cache.get.assert_not_called()


@with_feature_flags(ENABLE_COLUMN_VALUES_CACHE=True)
def test_values_for_column_use_cache_false(
    mocker: MockerFixture,
    database: Database,
) -> None:
    """
    Test that column values are not cached when use_cache is false.
    """
    mock_cache = mocker.MagicMock()
    mocker.patch.object(
        cache_manager,
        "_explore_form_data_cache",
        mock_cache,
    )
    mock_cache.get.return_value = None
    table = SqlaTable(
        database=database,
        schema=None,
        table_name="t",
        columns=[TableColumn(column_name="a")],
    )
    table.values_for_column("a", use_cache=False)
    mock_cache.get.assert_not_called()


@with_feature_flags(ENABLE_COLUMN_VALUES_CACHE=True)
def test_values_for_column_caching(
    mocker: MockerFixture,
    database: Database,
) -> None:
    """
    Test that column values are properly cached and retrieved from cache.
    """

    # Mock the cache manager
    mock_cache = mocker.MagicMock()
    mocker.patch.object(
        cache_manager,
        "_explore_form_data_cache",
        mock_cache,
    )
    mock_cache.get.return_value = None
    # Patch pd.read_sql_query to return [1, None] as the column_values
    pd = mocker.patch("superset.models.helpers.pd")
    pd.read_sql_query.return_value = pd.DataFrame(
        [
            1,
            None,
        ]
    )
    pd.read_sql_query.return_value.replace.return_value = pd.read_sql_query.return_value
    pd.read_sql_query.return_value.__getitem__.return_value.to_list.return_value = [
        1,
        None,
    ]

    table = SqlaTable(
        database=database,
        schema=None,
        table_name="t",
        columns=[TableColumn(column_name="a")],
    )

    # Test cache miss - should query database and cache results
    result = table.values_for_column("a", use_cache=True)

    assert result == [1, None]
    mock_cache.get.assert_called_once()
    mock_cache.set.assert_called_once()

    # Test cache hit - should return cached values without querying database
    mock_cache.get.return_value = [
        1,
        None,
        2,
    ]  # Different cached values
    mock_cache.set.reset_mock()

    result = table.values_for_column("a", use_cache=True)
    assert result == [1, None, 2]
    mock_cache.set.assert_not_called()  # Should not set cache again


def test_values_for_column_cache_key_generation(
    mocker: MockerFixture,
    database: Database,
) -> None:
    """
    Test that cache keys are generated consistently for the same parameters.
    """
    from superset.connectors.sqla.models import SqlaTable, TableColumn

    table = SqlaTable(
        database=database,
        schema=None,
        table_name="t",
        columns=[TableColumn(column_name="a")],
    )

    # Generate cache keys for the same parameters
    key1 = table._get_column_values_cache_key("a", 10000, False)
    key2 = table._get_column_values_cache_key("a", 10000, False)

    # Keys should be identical for identical parameters
    assert key1 == key2

    # Keys should be different for different parameters
    key3 = table._get_column_values_cache_key("a", 5000, False)
    assert key1 != key3

    key4 = table._get_column_values_cache_key("b", 10000, False)
    assert key1 != key4
