import { FilterOperator, Filters } from 'src/components/ListView';
import {
  createErrorHandler,
  createFetchDistinct,
  createFetchRelated,
} from 'src/views/CRUD/utils';
import { styled, t } from '@superset-ui/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AntdInput } from 'src/components';
import Button from 'src/components/Button';
import { FormLabel } from 'src/components/Form';
import Icons from 'src/components/Icons';
import SearchFilter from 'src/components/ListView/Filters/Search';
import SelectFilter from 'src/components/ListView/Filters/Select';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';

const SIDEBAR_WIDTH = '250px';

const SearchIcon = styled(Icons.Search)`
  color: ${({ theme }) => theme.colors.grayscale.light1};
`;

const StyledInput = styled(AntdInput)`
  border-radius: ${({ theme }) => theme.gridUnit}px;
`;

const createUserForFilters = (user: UserWithPermissionsAndRoles) => {
  if (!user) return undefined;

  return {
    userId: user.userId || 0,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    username: user.username || '',
  };
};

const createFilterDefinitions = (user: any): Filters => [
  {
    Header: t('Name'),
    key: 'table_name',
    id: 'table_name',
    input: 'search',
    operator: FilterOperator.Contains,
    unfilteredLabel: t('All'),
  },
  {
    Header: t('Owner'),
    key: 'owner',
    id: 'owners',
    input: 'select',
    operator: FilterOperator.RelationManyMany,
    unfilteredLabel: 'All',
    fetchSelects: createFetchRelated(
      'dataset',
      'owners',
      createErrorHandler(errMsg =>
        t('An error occurred while fetching dataset owner values: %s', errMsg),
      ),
      createUserForFilters(user),
    ),
    paginate: true,
  },
  {
    Header: t('Schema'),
    key: 'schema',
    id: 'schema',
    input: 'select',
    operator: FilterOperator.Equals,
    unfilteredLabel: 'All',
    fetchSelects: createFetchDistinct(
      'dataset',
      'schema',
      createErrorHandler(errMsg =>
        t('An error occurred while fetching schema values: %s', errMsg),
      ),
    ),
    paginate: true,
  },
  {
    Header: t('Type'),
    key: 'sql',
    id: 'sql',
    input: 'select',
    operator: FilterOperator.DatasetIsNullOrEmpty,
    unfilteredLabel: 'All',
    selects: [
      { label: t('Virtual'), value: false },
      { label: t('Physical'), value: true },
    ],
  },
  {
    Header: t('Database'),
    key: 'database',
    id: 'database',
    input: 'select',
    operator: FilterOperator.RelationOneMany,
    unfilteredLabel: 'All',
    fetchSelects: createFetchRelated(
      'dataset',
      'database',
      createErrorHandler(errMsg =>
        t('An error occurred while fetching datasets: %s', errMsg),
      ),
    ),
    paginate: true,
  },
  {
    Header: t('Modified by'),
    key: 'changed_by',
    id: 'changed_by',
    input: 'select',
    operator: FilterOperator.RelationOneMany,
    unfilteredLabel: t('All'),
    fetchSelects: createFetchRelated(
      'dataset',
      'changed_by',
      createErrorHandler(errMsg =>
        t(
          'An error occurred while fetching dataset datasource values: %s',
          errMsg,
        ),
      ),
      createUserForFilters(user),
    ),
    paginate: true,
  },
];

export const FilterSection = styled.div`
  margin-bottom: ${({ theme }) => theme.gridUnit * 4}px;
`;

const Sidebar = styled.div`
  width: ${SIDEBAR_WIDTH};
  border-right: 1px solid ${({ theme }) => theme.colors.grayscale.light2};
  padding: ${({ theme }) => theme.gridUnit * 5}px;
  overflow-y: auto;
  flex-shrink: 0;
`;

interface FilterSidebarProps {
  user: UserWithPermissionsAndRoles;
  appliedFilters: {
    [key: string]: any;
  };
  onFilterChange: (filterKey: string, value: any) => void;
  onClearFilters: () => void;
  filterRefs: React.MutableRefObject<{ [key: string]: any }>;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  user,
  appliedFilters,
  onFilterChange,
  onClearFilters,
  filterRefs,
}) => {
  // State for search input
  const [searchValue, setSearchValue] = useState(
    appliedFilters.table_name || '',
  );

  // Update search value when appliedFilters change
  useEffect(() => {
    setSearchValue(appliedFilters.table_name || '');
  }, [appliedFilters.table_name]);

  // Create filter definitions internally
  const filterDefinitions = useMemo(
    () => createFilterDefinitions(user),
    [user],
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      onFilterChange('table_name', value);
    },
    [onFilterChange],
  );

  const renderFilterComponent = useCallback(
    (filterType: any) => {
      const commonProps = {
        key: filterType.id,
        Header:
          typeof filterType.Header === 'string'
            ? filterType.Header
            : filterType.id,
        name: filterType.id,
        initialValue: appliedFilters[filterType.id],
        ref: (ref: any) => {
          // eslint-disable-next-line no-param-reassign
          filterRefs.current[filterType.id] = ref;
        },
      };

      if (filterType.input === 'search') {
        // Special handling for name filter to enable real-time search
        if (filterType.id === 'table_name') {
          return (
            <FilterSection key={filterType.id}>
              <FormLabel>{filterType.Header}</FormLabel>
              <StyledInput
                allowClear
                data-test="filters-search"
                placeholder={t('Type a value')}
                name={filterType.id}
                value={searchValue}
                onChange={e => handleSearchChange(e.target.value)}
                prefix={<SearchIcon iconSize="l" />}
              />
            </FilterSection>
          );
        }

        // Default search filter for other fields
        return (
          <FilterSection key={filterType.id}>
            <SearchFilter
              {...commonProps}
              toolTipDescription={filterType.toolTipDescription}
              onSubmit={(value: string) => onFilterChange(filterType.id, value)}
            />
          </FilterSection>
        );
      }

      if (filterType.input === 'select') {
        return (
          <FilterSection key={filterType.id}>
            <SelectFilter
              {...commonProps}
              selects={filterType.selects}
              fetchSelects={filterType.fetchSelects}
              paginate={filterType.paginate}
              onSelect={(selected: any) =>
                onFilterChange(filterType.id, selected?.value)
              }
            />
          </FilterSection>
        );
      }

      return null;
    },
    [
      appliedFilters,
      onFilterChange,
      filterRefs,
      searchValue,
      handleSearchChange,
    ],
  );

  return (
    <Sidebar>
      <FilterSection>
        <div style={{ marginBottom: '16px' }}>
          {filterDefinitions.map(renderFilterComponent)}
        </div>
        <Button
          onClick={() => {
            onClearFilters();
            setSearchValue('');
          }}
          buttonStyle="secondary"
          block
        >
          {t('Clear Filters')}
        </Button>
      </FilterSection>
    </Sidebar>
  );
};

export default FilterSidebar;
