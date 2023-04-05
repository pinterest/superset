import logging

from celery.utils.log import get_task_logger

from superset import db
from superset.exceptions import SupersetException
from superset.extensions import celery_app
from superset.models.core import Database

logger = get_task_logger(__name__)
logger.setLevel(logging.INFO)


@celery_app.task(name="db_tables_cache_warm_up")
def db_tables_cache_warm_up(database_id: str, schema_name: str):
    """
    Warm up tables in a database schema

    beat_schedule = {
        'db_tables_cache_warm_up': {
            'task': 'db_tables_cache_warm_up',
            'schedule': crontab(minute='*/10', hour='*'),  # every 10 minutes
            'kwargs': {'database_id': 1, 'schema_name': 'public'},
        },
    }
    """
    session = db.create_scoped_session()
    logger.info(
        f"Warming up database table cache for database_id: {database_id}, schema_name: {schema_name}"
    )
    try:
        database = session.query(Database).filter_by(id=database_id).one_or_none()
        if not database:
            logger.error(f"Database not found, database_id: {database_id}")

        database.get_all_table_names_in_schema(
            schema=schema_name,
            force=True,
            cache=database.table_cache_enabled,
            cache_timeout=database.table_cache_timeout,
        )
        database.get_all_view_names_in_schema(
            schema=schema_name,
            force=True,
            cache=database.table_cache_enabled,
            cache_timeout=database.table_cache_timeout,
        )
        logger.info(
            f"Database tables cache warm up succeeded for database_id: {database_id}, schema_name: {schema_name}"
        )
    except SupersetException as ex:
        logger.exception(
            f"Superset exception for db_tables_cache_warm_up job database_id: {database_id}, schema_name: {schema_name}, message: {ex.message}"
        )
