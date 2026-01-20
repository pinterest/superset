import logging
from typing import List

from celery.utils.log import get_task_logger

from superset import app, db
from superset.extensions import celery_app
from superset.models.dashboard import Dashboard
from superset.tags.models import Tag
from superset.tasks.thumbnails import cache_dashboard_thumbnail
from superset.utils.core import DatasourceType, apply_max_row_limit
from superset.daos.datasource import DatasourceDAO

logger = get_task_logger(__name__)
logger.setLevel(logging.INFO)


def get_dashboards_by_tag(tag: str) -> List[int]:
    dashboard_result = (
        db.session.query(Dashboard.id)
        .join(Dashboard.tags)
        .filter(Tag.name == tag)
        .all()
    )
    return [dashboard.id for dashboard in dashboard_result]


@celery_app.task(name="cache_dashboard_thumbnail_by_tags", soft_time_limit=600)
def cache_thumbnails_by_tags(tags: List[str]) -> None:
    """This job is used to cache Pinterest homepage dashboards by tags."""
    logger.info("Caching dashboard thumbnails for tags: %s", tags)
    for tag in tags:
        for dashboard_id in get_dashboards_by_tag(tag):
            logger.info("Caching thumbnail for dashboard ID: %s", dashboard_id)
            cache_dashboard_thumbnail.delay(
                current_user=None,
                dashboard_id=dashboard_id,
                force=True,
            )


@celery_app.task(name="cache_column_values")
def cache_column_values(datasource_id: int, column_name: str) -> None:
    """Cache column values for a given datasource and column name."""
    datasource = DatasourceDAO.get_datasource(DatasourceType.TABLE, datasource_id)
    row_limit = apply_max_row_limit(app.config["FILTER_SELECT_ROW_LIMIT"])
    denormalize_column = not datasource.normalize_columns
    datasource.values_for_column(
        column_name,
        limit=row_limit,
        denormalize_column=denormalize_column,
        use_cache=True,
    )
