import { useMemo } from 'react';
import { useFavoriteStatus } from 'src/views/CRUD/hooks';
import { Link, useHistory } from 'react-router-dom';
import { Dashboard } from 'src/views/CRUD/types';
import { LoadingCards } from 'src/pages/Home';
import { CardContainer, CardStyles } from 'src/views/CRUD/utils';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { styled, t } from '@superset-ui/core';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import ListViewCard from 'src/components/ListViewCard';
import FaveStar from 'src/components/FaveStar';

type DashboardContainerProps = {
  dashboards: Dashboard[];
  showThumbnails: boolean;
  user?: UserWithPermissionsAndRoles;
};

const Styles = styled.div`
  .card-container {
    max-height: none;
    grid-gap: ${({ theme }) => `${theme.gridUnit * 4}px`};
  }
`;

export default function DashboardContainer({
  dashboards,
  showThumbnails,
  user,
}: DashboardContainerProps) {
  const history = useHistory();
  const dashboardIds = useMemo(() => dashboards.map(d => d.id), [dashboards]);
  const [saveFavoriteStatus, favoriteStatus] = useFavoriteStatus(
    'dashboard',
    dashboardIds,
    addDangerToast,
  );

  return dashboards.length ? (
    <Styles>
      <CardContainer showThumbnails={showThumbnails} className="card-container">
        {dashboards.map(d => (
          <CardStyles
            onClick={() => {
              history.push(d.url);
            }}
            key={d.id}
          >
            <ListViewCard
              loading={d.loading || false}
              title={d.dashboard_title}
              certifiedBy={d.certified_by}
              certificationDetails={d.certification_details}
              cover={showThumbnails ? null : <></>}
              url={d.url}
              linkComponent={Link}
              imgURL={d.thumbnail_url}
              imgFallbackURL="/static/assets/images/dashboard-card-fallback.svg"
              description={
                d.description ?? t('Modified %s', d.changed_on_delta_humanized)
              }
              actions={
                <ListViewCard.Actions
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  {user?.userId && (
                    <FaveStar
                      itemId={d.id}
                      saveFaveStar={saveFavoriteStatus}
                      isStarred={!!favoriteStatus[d.id]}
                    />
                  )}
                </ListViewCard.Actions>
              }
            />
          </CardStyles>
        ))}
      </CardContainer>
    </Styles>
  ) : (
    <LoadingCards />
  );
}
