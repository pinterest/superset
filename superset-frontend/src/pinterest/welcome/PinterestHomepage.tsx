import { useEffect, useMemo, useState } from 'react';
import { styled, t } from '@superset-ui/core';
import { Dashboard } from 'src/views/CRUD/types';

import SubMenu from 'src/features/home/SubMenu';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import {
  getItem,
  LocalStorageKeys,
  setItem,
} from 'src/utils/localStorageHelpers';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import { HomepageTab, TopSectionInfo } from './types';
import {
  getViewAllLinkByTab,
  getTopDashboardsBySection,
  getUserFavoriteDashboards,
  getUserOwnedDashboards,
  getUserRecommendedDashboards,
  getDescriptionByTab,
} from './utils';
import PinterestHomepageTab from './PinterestHomepageTab';
import PinterestHomepageTopTab from './PinterestHomepageTopTab';

const StyledWelcomePageContainer = styled('div')`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 15px;
  .menu .ant-menu-item {
    li,
    div {
      a,
      div {
        font-size: ${({ theme }) => theme.typography.sizes.l}px;
      }
    }
  }
`;

const StyledHomepageTabDescription = styled('div')`
  font-size: ${({ theme }) => theme.typography.sizes.m}px;
  padding-left: 35px;
  color: ${({ theme }) => theme.colors.pinterest_black.base};
`;

export default function PinterestHomepage() {
  const [mine, setMine] = useState<Dashboard[] | null>(null);
  const [recommended, setRecommended] = useState<Dashboard[] | null>(null);
  const [favorites, setFavorites] = useState<Dashboard[] | null>(null);
  const [dashboardsBySection, setDashboardsBySection] = useState<
    TopSectionInfo[] | null
  >(null);

  const defaultTab = getItem(
    LocalStorageKeys.PinterestHomepageTabFilter,
    HomepageTab.Top,
  );
  const [activeTab, setActiveTab] = useState(defaultTab);

  const history = useHistory();
  const user: UserWithPermissionsAndRoles = useSelector<
    any,
    UserWithPermissionsAndRoles
  >(state => state.user);
  const { addDangerToast } = useToasts();
  const description = useMemo(
    () => getDescriptionByTab(activeTab),
    [activeTab],
  );

  useEffect(() => {
    // Load the data for the active tab if needed
    if (activeTab === HomepageTab.Top && !dashboardsBySection) {
      getTopDashboardsBySection(addDangerToast).then(dashboardsBySection =>
        setDashboardsBySection(dashboardsBySection),
      );
    } else if (activeTab === HomepageTab.Recommended && !recommended) {
      getUserRecommendedDashboards(addDangerToast).then(recommended =>
        setRecommended(recommended),
      );
    } else if (activeTab === HomepageTab.Favorites && !favorites) {
      getUserFavoriteDashboards(addDangerToast).then(favorites =>
        setFavorites(favorites),
      );
    } else if (activeTab === HomepageTab.Mine && !mine) {
      getUserOwnedDashboards(user, addDangerToast).then(mine => setMine(mine));
    }
  }, [activeTab, mine, recommended, favorites, dashboardsBySection, user]);

  const menuTabs = [
    HomepageTab.Top,
    HomepageTab.Recommended,
    HomepageTab.Favorites,
    HomepageTab.Mine,
  ].map(tab => ({
    name: tab,
    label: t(tab),
    onClick: () => {
      setActiveTab(tab);
      setItem(LocalStorageKeys.PinterestHomepageTabFilter, tab);
    },
  }));

  return (
    <StyledWelcomePageContainer>
      <SubMenu
        activeChild={activeTab}
        tabs={menuTabs}
        buttons={[
          {
            name: t('View All »'),
            buttonStyle: 'link',
            onClick: () => {
              const target = getViewAllLinkByTab(activeTab, user);
              history.push(target);
            },
          },
        ]}
      />
      <StyledHomepageTabDescription>{description}</StyledHomepageTabDescription>
      {activeTab === HomepageTab.Top ? (
        <PinterestHomepageTopTab
          dashboardsBySection={dashboardsBySection}
          user={user}
        />
      ) : (
        <PinterestHomepageTab
          user={user}
          activeTab={activeTab}
          mine={mine}
          favorites={favorites}
          recommended={recommended}
        />
      )}
    </StyledWelcomePageContainer>
  );
}
