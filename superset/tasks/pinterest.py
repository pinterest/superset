from superset.extensions import celery_app
from superset import db
from typing import List, Optional
from superset.models.dashboard import Dashboard
from superset.tags.models import Tag
from superset.tasks.thumbnails import cache_dashboard_thumbnail
import logging

logger = logging.getLogger(__name__)

def get_dashboards_by_tag(tag: str) -> List[int]:
    dashboard_result = (
        db.session.query(Dashboard.id)
        .join(Dashboard.tags)
        .filter(Tag.name == tag)
        .all()
    )
    return [dashboard.id for dashboard in dashboard_result]

@celery_app.task(name="cache_dashboard_thumbnail_by_tags", soft_time_limit=600)
def cache_thumbnails_by_tags(tags: List[str]):
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
    