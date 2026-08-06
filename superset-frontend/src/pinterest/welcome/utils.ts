import { SupersetClient } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import getBootstrapData from 'src/utils/getBootstrapData';
import rison from 'rison';
import { Dashboard } from 'src/views/CRUD/types';
import { TopSectionConfig, TopSectionInfo, HomepageTab } from './types';

const PAGE_SIZE = 20; // 4 rows of 5 cards each
const DEFAULT_DASHBOARD_FILTER_PARAMS = {
  pageIndex: 0,
  pageSize: PAGE_SIZE,
  sortBy: [
    {
      id: 'changed_on_delta_humanized',
      desc: true,
    },
  ],
};

const getDashboardListLink = (
  filters?: Record<string, { label: string; value: string | number | boolean }>,
) =>
  filters
    ? `/dashboard/list/?filters=${rison.encode(filters)}`
    : '/dashboard/list/';

const queryDashboards = async (params: string, onError: () => void) => {
  try {
    const { json } = await SupersetClient.get({
      endpoint: `/api/v1/dashboard/?q=${params}`,
    });
    return json?.result;
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    onError();
  }
  return null;
};

export const getViewAllLinkByTab = (
  activeTab: HomepageTab,
  user: UserWithPermissionsAndRoles,
): string => {
  if (activeTab === HomepageTab.Top) {
    const topTagValue =
      getBootstrapData().common.conf.PINTEREST_TOP_TAG_ID ?? 'Top';
    return getDashboardListLink({
      tags: { label: t('Top'), value: topTagValue },
    });
  }
  if (activeTab === HomepageTab.Recommended) {
    return getDashboardListLink();
  }
  if (activeTab === HomepageTab.Favorites) {
    return getDashboardListLink({
      favorite: { label: t('Yes'), value: true },
    });
  }
  // activeTab === HomepageTab.Mine
  return user.userId == null
    ? getDashboardListLink()
    : getDashboardListLink({
        owners: {
          label: `${user.firstName} ${user.lastName}`,
          value: user.userId,
        },
      });
};

const getDashboardsByTag = async (
  tag: string,
  onError: () => void,
): Promise<Dashboard[]> => {
  const params = rison.encode({
    ...DEFAULT_DASHBOARD_FILTER_PARAMS,
    filters: [
      {
        col: 'tags',
        opr: 'dashboard_tags',
        value: tag,
      },
    ],
  });
  return queryDashboards(params, onError);
};

export const getTopDashboardsBySection = async (
  onError: (e: string) => void,
): Promise<TopSectionInfo[]> => {
  const topSections = (getBootstrapData().common.conf
    .PINTEREST_WELCOME_TOP_SECTIONS ?? []) as TopSectionConfig[];
  const dashboardPromises = topSections.map(async section => {
    const dashboards = await getDashboardsByTag(section.tag, () =>
      onError('Failed to load top dashboards'),
    );
    return {
      name: section.name,
      dashboards,
    };
  });
  const dashboardsBySection = await Promise.all(dashboardPromises);
  return dashboardsBySection;
};

export const getUserOwnedDashboards = async (
  user: UserWithPermissionsAndRoles,
  onError: (e: string) => void,
): Promise<Dashboard[]> => {
  const params = rison.encode({
    ...DEFAULT_DASHBOARD_FILTER_PARAMS,
    filters: [
      {
        col: 'created_by',
        opr: 'rel_o_m',
        value: `${user?.userId}`,
      },
    ],
  });

  return queryDashboards(params, () =>
    onError('Failed to load user dashboards'),
  );
};

export const getUserFavoriteDashboards = async (
  onError: (e: string) => void,
): Promise<Dashboard[]> => {
  const params = rison.encode({
    ...DEFAULT_DASHBOARD_FILTER_PARAMS,
    filters: [
      {
        col: 'id',
        opr: 'dashboard_is_favorite',
        value: true,
      },
    ],
  });
  return queryDashboards(params, () =>
    onError('Failed to load favorite dashboards'),
  );
};
export const getUserRecommendedDashboards = async (
  onError: (e: string) => void,
) => {
  const params = rison.encode({
    ...DEFAULT_DASHBOARD_FILTER_PARAMS,
    filters: [
      {
        col: 'id',
        opr: 'dashboard_is_recommended',
        value: true,
      },
    ],
  });
  return queryDashboards(params, () =>
    onError('Failed to load recommended dashboards'),
  );
};

export const getDescriptionByTab = (tab: HomepageTab): string => {
  if (tab === HomepageTab.Top) {
    return t(
      'These are Pinterest Top Dashboards in terms of importance, popularity, and quality.',
    );
  }
  if (tab === HomepageTab.Recommended) {
    return t('These are your most viewed/most recently viewed dashboards.');
  }
  if (tab === HomepageTab.Favorites) {
    return t('These are your favorite dashboards.');
  }
  return t('These are the dashboards you own.'); // activeTab === HomepageTab.Mine
};
