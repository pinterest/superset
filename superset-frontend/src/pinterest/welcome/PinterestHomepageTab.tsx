import { useEffect, useState } from 'react';
import { Dashboard } from 'src/views/CRUD/types';
import { LoadingCards } from 'src/pages/Home';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import { HomepageTab } from './types';
import DashboardContainer from './DashboardContainer';
import EmptyState from './EmptyState';

type PinterestHomepageTabProps = {
  user: UserWithPermissionsAndRoles;
  activeTab: HomepageTab;
  mine: Dashboard[] | null;
  favorites: Dashboard[] | null;
  recommended: Dashboard[] | null;
};

export default function PinterestHomepageTab({
  user,
  activeTab,
  mine,
  favorites,
  recommended,
}: PinterestHomepageTabProps) {
  const [dashboards, setDashboards] = useState<Dashboard[] | null>([]);
  useEffect(() => {
    if (activeTab === HomepageTab.Mine) {
      setDashboards(mine);
    } else if (activeTab === HomepageTab.Recommended) {
      setDashboards(recommended);
    } else {
      setDashboards(favorites);
    }
  }, [activeTab, mine, favorites, recommended]);

  return !dashboards ? (
    <LoadingCards />
  ) : !dashboards.length ? (
    <EmptyState tab={activeTab} />
  ) : (
    <DashboardContainer
      dashboards={dashboards}
      showThumbnails={false}
      user={user}
    />
  );
}
