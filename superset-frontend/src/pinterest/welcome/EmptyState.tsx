import { useMemo } from 'react';
import { EmptyState as EmptyStateComponent } from '@superset-ui/core/components';
import OriginalEmptyState, {
  EmptyContainer,
} from 'src/features/home/EmptyState';
import { t } from '@superset-ui/core';
import { WelcomeTable } from 'src/features/home/types';
import { HomepageTab } from './types';

type EmptyStateProps = {
  tab: HomepageTab;
};

export default function EmptyState({ tab }: EmptyStateProps) {
  const description = useMemo(() => {
    if (tab === HomepageTab.Recommended) {
      return 'Your viewed dashboards will appear here';
    }
    if (tab === HomepageTab.Mine) {
      return t('No dashboards yet');
    }
    return null;
  }, [tab]);

  return tab === HomepageTab.Favorites ? (
    <OriginalEmptyState tableName={WelcomeTable.Dashboards} tab="favorites" />
  ) : (
    <EmptyContainer>
      <EmptyStateComponent
        image="empty-dashboard.svg"
        size="large"
        description={description}
      />
    </EmptyContainer>
  );
}
