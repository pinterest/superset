import { styled } from '@apache-superset/core/theme';
import { LoadingCards } from 'src/pages/Home';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import DashboardContainer from './DashboardContainer';
import { TopSectionInfo } from './types';

const StyledSectionHeader = styled('div')`
  font-weight: ${({ theme }) => theme.fontWeightStrong};
  font-size: ${({ theme }) => theme.fontSizeHeading1}px;
  padding-inline-start: ${({ theme }) => theme.sizeUnit * 9}px;
  color: ${({ theme }) => theme.colorError};
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
    return <LoadingCards cover />;
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
