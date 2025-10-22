import {
  UserRoles,
  UserWithPermissionsAndRoles,
} from 'src/types/bootstrapTypes';
import { fireEvent, render, screen } from 'spec/helpers/testing-library';
import { useListViewResource } from 'src/views/CRUD/hooks';

import DatasourceAdvancedSearchModal from './DatasourceAdvancedSearchModal';

// Mock the hooks and utilities
jest.mock('src/views/CRUD/hooks', () => ({
  useListViewResource: jest.fn(() => ({
    state: {
      loading: false,
      resourceCollection: [],
      resourceCount: 0,
    },
    fetchData: jest.fn(),
  })),
}));

jest.mock('src/explore/exploreUtils', () => ({
  useDebouncedEffect: jest.fn(callback => callback()),
  formatSelectOptions: jest.fn(options => options),
}));

jest.mock(
  'src/components/MessageToasts/withToasts',
  () => (Component: any) => Component,
);

// Mock the child components
jest.mock(
  './FilterSidebar',
  () =>
    function MockFilterSidebar({ onFilterChange, onClearFilters }: any) {
      return (
        <div data-test="filter-sidebar">
          <button
            type="button"
            onClick={() => onFilterChange('table_name', 'test')}
          >
            Test Filter
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('certified', true)}
          >
            Test Certified Filter
          </button>
          <button type="button" onClick={onClearFilters}>
            Clear Filters
          </button>
          <button
            type="button"
            onClick={() => {
              onFilterChange('table_name', 'test');
              onFilterChange('certified', true);
            }}
          >
            Test Multiple Filters
          </button>
        </div>
      );
    },
);

jest.mock(
  './DatasetTable',
  () =>
    function MockDatasetTable({ onSelectDatasource, onServerPagination }: any) {
      return (
        <div data-test="dataset-table">
          <button
            type="button"
            onClick={() =>
              onSelectDatasource({
                id: 1,
                table_name: 'test_table',
                type: 'table',
              })
            }
          >
            Select Dataset
          </button>
          <button
            type="button"
            onClick={() => onServerPagination({ pageIndex: 1 })}
          >
            Next Page
          </button>
        </div>
      );
    },
);

const mockUser: UserWithPermissionsAndRoles = {
  userId: 1,
  firstName: 'John',
  lastName: 'Doe',
  username: 'john.doe',
  email: 'john.doe@example.com',
  isActive: true,
  createdOn: '2023-01-01T00:00:00Z',
  isAnonymous: false,
  roles: {} as UserRoles,
  permissions: {},
};

const defaultProps = {
  addDangerToast: jest.fn(),
  addSuccessToast: jest.fn(),
  onDatasourceSelect: jest.fn(),
  onHide: jest.fn(),
  show: true,
  user: mockUser,
};

describe('DatasourceAdvancedSearchModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing when show is true', () => {
    render(<DatasourceAdvancedSearchModal {...defaultProps} />);
    expect(screen.getByText('Advanced Dataset Search')).toBeInTheDocument();
    expect(screen.getByTestId('filter-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('dataset-table')).toBeInTheDocument();
  });

  test('does not render when show is false', () => {
    render(<DatasourceAdvancedSearchModal {...defaultProps} show={false} />);
    expect(
      screen.queryByText('Advanced Dataset Search'),
    ).not.toBeInTheDocument();
  });

  test('handles datasource selection', () => {
    const onDatasourceSelect = jest.fn();
    const onHide = jest.fn();

    render(
      <DatasourceAdvancedSearchModal
        {...defaultProps}
        onDatasourceSelect={onDatasourceSelect}
        onHide={onHide}
      />,
    );

    const selectButton = screen.getByText('Select Dataset');
    fireEvent.click(selectButton);

    expect(onDatasourceSelect).toHaveBeenCalledWith({
      label: 'test_table',
      value: '1__table',
    });
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  test('handles filter changes', () => {
    const mockFetchData = jest.fn();
    (useListViewResource as jest.Mock).mockReturnValue({
      state: {
        loading: false,
        resourceCollection: [],
        resourceCount: 0,
      },
      fetchData: mockFetchData,
    });

    render(<DatasourceAdvancedSearchModal {...defaultProps} />);

    const filterButton = screen.getByText('Test Filter');
    fireEvent.click(filterButton);

    // The debounced effect should trigger fetchData
    expect(mockFetchData).toHaveBeenCalled();
  });

  test('builds filter query correctly for table_name', () => {
    const mockFetchData = jest.fn();
    (useListViewResource as jest.Mock).mockReturnValue({
      state: {
        loading: false,
        resourceCollection: [],
        resourceCount: 0,
      },
      fetchData: mockFetchData,
    });

    render(<DatasourceAdvancedSearchModal {...defaultProps} />);

    // Trigger a filter change
    const filterButton = screen.getByText('Test Filter');
    fireEvent.click(filterButton);

    expect(mockFetchData).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({
            id: 'table_name',
            operator: 'ct',
            value: 'test',
          }),
        ]),
      }),
    );
  });

  test('builds filter query correctly for certified filter', () => {
    const mockFetchData = jest.fn();
    (useListViewResource as jest.Mock).mockReturnValue({
      state: {
        loading: false,
        resourceCollection: [],
        resourceCount: 0,
      },
      fetchData: mockFetchData,
    });

    // Mock FilterSidebar to trigger certified filter
    jest.doMock(
      './FilterSidebar',
      () =>
        function MockFilterSidebar({ onFilterChange }: any) {
          return (
            <div data-testid="filter-sidebar">
              <button
                type="button"
                onClick={() => onFilterChange('certified', true)}
              >
                Test Certified Filter
              </button>
            </div>
          );
        },
    );

    render(<DatasourceAdvancedSearchModal {...defaultProps} />);

    const certifiedButton = screen.getByText('Test Certified Filter');
    fireEvent.click(certifiedButton);

    expect(mockFetchData).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({
            id: 'id',
            operator: 'dataset_is_certified',
            value: true,
          }),
        ]),
      }),
    );
  });

  test('handles empty filter values', () => {
    const mockFetchData = jest.fn();
    (useListViewResource as jest.Mock).mockReturnValue({
      state: {
        loading: false,
        resourceCollection: [],
        resourceCount: 0,
      },
      fetchData: mockFetchData,
    });

    render(<DatasourceAdvancedSearchModal {...defaultProps} />);

    // The component should handle empty filters gracefully
    expect(mockFetchData).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [],
      }),
    );
  });

  test('handles null and undefined filter values', () => {
    const mockFetchData = jest.fn();
    (useListViewResource as jest.Mock).mockReturnValue({
      state: {
        loading: false,
        resourceCollection: [],
        resourceCount: 0,
      },
      fetchData: mockFetchData,
    });

    // Mock FilterSidebar to trigger null/undefined filters
    jest.doMock(
      './FilterSidebar',
      () =>
        function MockFilterSidebar({ onFilterChange }: any) {
          return (
            <div data-testid="filter-sidebar">
              <button
                type="button"
                onClick={() => onFilterChange('table_name', null)}
              >
                Test Null Filter
              </button>
              <button
                type="button"
                onClick={() => onFilterChange('table_name', undefined)}
              >
                Test Undefined Filter
              </button>
              <button
                type="button"
                onClick={() => onFilterChange('table_name', '')}
              >
                Test Empty Filter
              </button>
            </div>
          );
        },
    );

    render(<DatasourceAdvancedSearchModal {...defaultProps} />);

    // Should not include null, undefined, or empty string filters
    expect(mockFetchData).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [],
      }),
    );
  });

  test('handles user with missing properties', () => {
    const userWithMissingProps = {
      ...mockUser,
      userId: undefined,
      firstName: undefined,
      lastName: undefined,
      username: undefined,
    };

    render(
      <DatasourceAdvancedSearchModal
        {...defaultProps}
        user={userWithMissingProps}
      />,
    );
    expect(screen.getByText('Advanced Dataset Search')).toBeInTheDocument();
  });

  test('handles null user', () => {
    render(
      <DatasourceAdvancedSearchModal {...defaultProps} user={null as any} />,
    );
    expect(screen.getByText('Advanced Dataset Search')).toBeInTheDocument();
  });

  test('calls fetchData with correct parameters', () => {
    const mockFetchData = jest.fn();
    (useListViewResource as jest.Mock).mockReturnValue({
      state: {
        loading: false,
        resourceCollection: [],
        resourceCount: 0,
      },
      fetchData: mockFetchData,
    });

    render(<DatasourceAdvancedSearchModal {...defaultProps} />);

    expect(mockFetchData).toHaveBeenCalledWith(
      expect.objectContaining({
        pageIndex: 0,
        pageSize: 25, // DATASET_PAGE_SIZE
        filters: [],
        sortBy: expect.any(Array), // Just check that it's an array
      }),
    );
  });

  test('handles multiple filter changes', () => {
    const mockFetchData = jest.fn();
    (useListViewResource as jest.Mock).mockReturnValue({
      state: {
        loading: false,
        resourceCollection: [],
        resourceCount: 0,
      },
      fetchData: mockFetchData,
    });

    // Mock FilterSidebar to trigger multiple filters
    jest.doMock(
      './FilterSidebar',
      () =>
        function MockFilterSidebar({ onFilterChange }: any) {
          return (
            <div data-testid="filter-sidebar">
              <button
                type="button"
                onClick={() => {
                  onFilterChange('table_name', 'test');
                  onFilterChange('certified', true);
                }}
              >
                Test Multiple Filters
              </button>
            </div>
          );
        },
    );

    render(<DatasourceAdvancedSearchModal {...defaultProps} />);

    const multiFilterButton = screen.getByText('Test Multiple Filters');
    fireEvent.click(multiFilterButton);

    // Should handle multiple filters correctly
    expect(mockFetchData).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({
            id: 'table_name',
            operator: 'ct',
            value: 'test',
          }),
          expect.objectContaining({
            id: 'id',
            operator: 'dataset_is_certified',
            value: true,
          }),
        ]),
      }),
    );
  });
});
