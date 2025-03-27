import { styled, SupersetTheme } from '@superset-ui/core';
import { LoadingCards } from 'src/pages/Home';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import DashboardContainer from './DashboardContainer';
import { TopSectionInfo } from './types';

const StyledSectionHeader = styled('div')`
  font-weight: bold;
  font-size: 36px;
  padding-left: 35px;
  color: ${({ theme }: { theme: SupersetTheme }) =>
    theme.colors.pinterest_red.base};
`;

type PinterestHomepageTopTabProps = {
  dashboardsBySection?: TopSectionInfo[] | null;
  user?: UserWithPermissionsAndRoles;
};

export default function PinterestHomepageTopTab({
  dashboardsBySection,
  user,
}: PinterestHomepageTopTabProps) {
  if (!dashboardsBySection) {
    return <LoadingCards />;
  }
  return (
    <div>
      {dashboardsBySection.map(({ name, dashboards }) => (
        <div key={name}>
          <StyledSectionHeader>{name}</StyledSectionHeader>
          <DashboardContainer
            dashboards={dashboards}
            user={user}
            showThumbnails
          />
        </div>
      ))}
    </div>
  );
}
