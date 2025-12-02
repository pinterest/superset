import {
  PAGE_SIZE as DATASET_PAGE_SIZE,
  SORT_BY as DATASET_SORT_BY,
} from 'src/features/datasets/constants';
import { FunctionComponent, useCallback, useRef, useState } from 'react';
import { ServerPagination, SortByType } from 'src/components/TableView/types';
import { styled, t } from '@superset-ui/core';

import { Dataset } from '@superset-ui/chart-controls';
import { FilterOperator } from 'src/components/ListView/types';
import Modal from 'src/components/Modal';
import { SLOW_DEBOUNCE } from 'src/constants';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import { useDebouncedEffect } from 'src/explore/exploreUtils';
import { useListViewResource } from 'src/views/CRUD/hooks';
import withToasts from 'src/components/MessageToasts/withToasts';

import DatasetTable from './DatasetTable';
import FilterSidebar from './FilterSidebar';

const StyledModal = styled(Modal)`
  .ant-modal-body {
    display: flex;
    flex-direction: row;
    padding: 0;
  }
`;

const OPERATOR_BY_FILTER_KEY: Record<string, string> = {
  table_name: FilterOperator.Contains,
  sql: FilterOperator.DatasetIsNullOrEmpty,
  database: FilterOperator.RelationOneMany,
  schema: FilterOperator.Equals,
  owners: FilterOperator.RelationManyMany,
  certified: FilterOperator.DatasetIsCertified,
  changed_by: FilterOperator.RelationOneMany,
};

export interface DatasourceAdvancedSearchModalProps {
  addDangerToast: (msg: string) => void;
  onDatasourceSelect: (datasource: { label: string; value: string }) => void;
  onHide: () => void;
  show: boolean;
  user: UserWithPermissionsAndRoles;
}

const DatasourceAdvancedSearchModal: FunctionComponent<
  DatasourceAdvancedSearchModalProps
> = ({ addDangerToast, onDatasourceSelect, onHide, show, user }) => {
  // State
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortByType>(DATASET_SORT_BY);
  const [appliedFilters, setAppliedFilters] = useState<{ [key: string]: any }>(
    {},
  );

  // Refs
  const filterRefs = useRef<{ [key: string]: any }>({});

  // Data fetching
  const {
    state: { loading, resourceCollection, resourceCount },
    fetchData,
  } = useListViewResource<Dataset>('dataset', t('dataset'), addDangerToast);

  // Event Handlers
  const handleDatasourceSelect = useCallback(
    (datasource: any) => {
      const formattedDatasource = {
        label: datasource.table_name,
        value: `${datasource.id}__${datasource.type}`,
      };
      onDatasourceSelect(formattedDatasource);
      onHide();
    },
    [onDatasourceSelect, onHide],
  );

  const handleFilterChange = useCallback((filterKey: string, value: any) => {
    setAppliedFilters((prev: any) => ({
      ...prev,
      [filterKey]: value,
    }));
    setPageIndex(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setAppliedFilters({});
    setPageIndex(0);

    // Clear all filter components
    Object.values(filterRefs.current).forEach(ref => {
      ref?.clearFilter?.();
    });
  }, []);

  const handleServerPagination = useCallback((args: ServerPagination) => {
    setPageIndex(args.pageIndex);
    if (args.sortBy) {
      setSortBy(args.sortBy.length > 0 ? args.sortBy : DATASET_SORT_BY);
    }
  }, []);

  const buildFilterQuery = (filterKey: string, value: any) => {
    if (!(filterKey in OPERATOR_BY_FILTER_KEY)) {
      return null;
    }
    const operator = OPERATOR_BY_FILTER_KEY[filterKey];
    // Certified filter is temporarily removed in this implementation
    // but leaving this logic for when (if) it is implemented
    const filterId =
      operator !== FilterOperator.DatasetIsCertified ? filterKey : 'id';
    return {
      id: filterId,
      operator,
      value,
    };
  };

  const buildFiltersArray = useCallback(
    (appliedFilters: Record<string, any>) => {
      const filters: any[] = [];

      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const filter = buildFilterQuery(key, value);
          if (filter) {
            filters.push(filter);
          }
        }
      });

      return filters;
    },
    [],
  );

  // Data fetching effect
  useDebouncedEffect(
    () => {
      const filters = buildFiltersArray(appliedFilters);
      fetchData({
        pageIndex,
        pageSize: DATASET_PAGE_SIZE,
        filters,
        sortBy,
      });
    },
    SLOW_DEBOUNCE,
    [pageIndex, sortBy, appliedFilters],
  );

  return (
    <StyledModal
      show={show}
      onHide={onHide}
      responsive
      title={t('Advanced Dataset Search')}
      hideFooter
    >
      <FilterSidebar
        user={user}
        appliedFilters={appliedFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        filterRefs={filterRefs}
      />
      <DatasetTable
        loading={loading}
        data={resourceCollection}
        pageSize={DATASET_PAGE_SIZE}
        pageIndex={pageIndex}
        sortBy={sortBy}
        totalCount={resourceCount}
        onSelectDatasource={handleDatasourceSelect}
        onServerPagination={handleServerPagination}
      />
    </StyledModal>
  );
};

export default withToasts(DatasourceAdvancedSearchModal);
