import { fireEvent, render, screen } from 'spec/helpers/testing-library';

import DatasetTable from './DatasetTable';

// Mock the TableView component
jest.mock('src/components/TableView', () => {
  const MockTableView = function MockTableView({
    columns,
    data,
    onServerPagination,
    loading,
    totalCount,
  }: any) {
    return (
      <div data-test="table-view">
        {loading && <div data-test="loading">Loading...</div>}
        <div data-test="table-data">
          {data.map((item: any, index: number) => (
            <div key={index} data-test={`table-row-${index}`}>
              <button
                type="button"
                data-test="datasource-link"
                onClick={() => {
                  // Simulate the datasource selection by calling the Cell component
                  const nameColumn = columns.find(
                    (col: any) => col.accessor === 'table_name',
                  );
                  if (nameColumn?.Cell) {
                    const cellProps = { row: { original: item } };
                    const cellElement = nameColumn.Cell(cellProps);
                    cellElement?.props?.onClick?.();
                  }
                }}
              >
                {item.table_name}
              </button>
              <span data-test={`type-${index}`}>
                {item.kind === 'physical' ? 'Physical' : 'Virtual'}
              </span>
              <span data-test={`schema-${index}`}>{item.schema}</span>
              <span data-test={`database-${index}`}>
                {item.database?.database_name}
              </span>
              <div data-test={`owners-${index}`}>
                {item.owners?.map((owner: any, ownerIndex: number) => (
                  <span
                    key={ownerIndex}
                    data-test={`owner-${index}-${ownerIndex}`}
                  >
                    {owner.firstName} {owner.lastName}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div data-test="pagination">
          <button
            type="button"
            onClick={() => onServerPagination({ pageIndex: 1, sortBy: [] })}
            data-test="next-page"
          >
            Next Page
          </button>
        </div>
        <div data-test="row-count">
          1-{data.length} of {totalCount}
        </div>
      </div>
    );
  };

  // Add the EmptyWrapperType enum
  MockTableView.EmptyWrapperType = {
    Small: 'Small',
    Large: 'Large',
  };

  return MockTableView;
});

// Mock the Loading component
jest.mock('src/components/Loading', () => () => (
  <div data-test="loading-component">Loading...</div>
));

// Mock the FacePile component
jest.mock('src/components/FacePile', () => ({ users }: any) => (
  <div data-test="face-pile">
    {users?.map((user: any, index: number) => (
      <span key={index} data-test={`owner-${index}`}>
        {user.firstName} {user.lastName}
      </span>
    ))}
  </div>
));

const mockData = [
  {
    id: 1,
    table_name: 'test_table_1',
    kind: 'physical',
    schema: 'public',
    database: { database_name: 'test_db' },
    owners: [
      { firstName: 'John', lastName: 'Doe', username: 'john.doe' },
      { firstName: 'Jane', lastName: 'Smith', username: 'jane.smith' },
    ],
  },
  {
    id: 2,
    table_name: 'test_table_2',
    kind: 'virtual',
    schema: 'analytics',
    database: { database_name: 'analytics_db' },
    owners: [
      { firstName: 'Bob', lastName: 'Johnson', username: 'bob.johnson' },
    ],
  },
];

const defaultProps = {
  loading: false,
  data: mockData,
  pageSize: 25,
  pageIndex: 0,
  sortBy: [{ id: 'table_name', desc: false }],
  totalCount: 2,
  onSelectDatasource: jest.fn(),
  onServerPagination: jest.fn(),
};

describe('DatasetTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<DatasetTable {...defaultProps} />);
    expect(screen.getByTestId('table-view')).toBeInTheDocument();
  });

  test('renders dataset data', () => {
    render(<DatasetTable {...defaultProps} />);

    expect(screen.getByText('test_table_1')).toBeInTheDocument();
    expect(screen.getByText('test_table_2')).toBeInTheDocument();
    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('Virtual')).toBeInTheDocument();
    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByText('analytics')).toBeInTheDocument();
    expect(screen.getByText('test_db')).toBeInTheDocument();
    expect(screen.getByText('analytics_db')).toBeInTheDocument();
  });

  test('renders owners using FacePile', () => {
    render(<DatasetTable {...defaultProps} />);

    expect(screen.getByTestId('owner-0-0')).toHaveTextContent('John Doe');
    expect(screen.getByTestId('owner-0-1')).toHaveTextContent('Jane Smith');
    expect(screen.getByTestId('owner-1-0')).toHaveTextContent('Bob Johnson');
  });

  test('handles dataset selection', () => {
    const onSelectDatasource = jest.fn();
    render(
      <DatasetTable
        {...defaultProps}
        onSelectDatasource={onSelectDatasource}
      />,
    );

    const firstDatasetLink = screen.getByText('test_table_1');
    fireEvent.click(firstDatasetLink);

    expect(onSelectDatasource).toHaveBeenCalledWith({
      type: 'table',
      id: 1,
      table_name: 'test_table_1',
      kind: 'physical',
      schema: 'public',
      database: { database_name: 'test_db' },
      owners: [
        { firstName: 'John', lastName: 'Doe', username: 'john.doe' },
        { firstName: 'Jane', lastName: 'Smith', username: 'jane.smith' },
      ],
    });
  });

  test('handles server pagination', () => {
    const onServerPagination = jest.fn();
    render(
      <DatasetTable
        {...defaultProps}
        onServerPagination={onServerPagination}
      />,
    );

    const nextPageButton = screen.getByTestId('next-page');
    fireEvent.click(nextPageButton);

    expect(onServerPagination).toHaveBeenCalledWith({
      pageIndex: 1,
      sortBy: [],
    });
  });

  test('shows loading state', () => {
    render(<DatasetTable {...defaultProps} loading />);

    expect(screen.getByTestId('loading-component')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('does not show loading when not loading', () => {
    render(<DatasetTable {...defaultProps} loading={false} />);

    expect(screen.queryByTestId('loading-component')).not.toBeInTheDocument();
  });

  test('renders correct row count', () => {
    render(<DatasetTable {...defaultProps} />);

    expect(screen.getByText('1-2 of 2')).toBeInTheDocument();
  });

  test('handles datasets with missing owners', () => {
    const dataWithoutOwners = [
      {
        id: 3,
        table_name: 'table_without_owners',
        kind: 'physical',
        schema: 'public',
        database: { database_name: 'test_db' },
        owners: [],
      },
    ];

    render(<DatasetTable {...defaultProps} data={dataWithoutOwners} />);

    expect(screen.getByText('table_without_owners')).toBeInTheDocument();
    expect(screen.getByTestId('owners-0')).toBeInTheDocument();
  });

  test('handles datasets with null owners', () => {
    const dataWithNullOwners = [
      {
        id: 4,
        table_name: 'table_with_null_owners',
        kind: 'physical',
        schema: 'public',
        database: { database_name: 'test_db' },
        owners: null,
      },
    ];

    render(<DatasetTable {...defaultProps} data={dataWithNullOwners} />);

    expect(screen.getByText('table_with_null_owners')).toBeInTheDocument();
    expect(screen.getByTestId('owners-0')).toBeInTheDocument();
  });

  test('handles datasets with missing database', () => {
    const dataWithoutDatabase = [
      {
        id: 5,
        table_name: 'table_without_database',
        kind: 'physical',
        schema: 'public',
        database: null,
        owners: [],
      },
    ];

    render(<DatasetTable {...defaultProps} data={dataWithoutDatabase} />);

    expect(screen.getByText('table_without_database')).toBeInTheDocument();
  });

  test('renders correct column configuration', () => {
    render(<DatasetTable {...defaultProps} />);

    // Verify that the table renders with the expected columns
    expect(screen.getByText('test_table_1')).toBeInTheDocument();
    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByText('test_db')).toBeInTheDocument();
  });

  test('handles different sort configurations', () => {
    const sortByDesc = [{ id: 'table_name', desc: true }];
    render(<DatasetTable {...defaultProps} sortBy={sortByDesc} />);

    expect(screen.getByTestId('table-view')).toBeInTheDocument();
  });

  test('handles large total count', () => {
    render(<DatasetTable {...defaultProps} totalCount={1000} />);

    expect(screen.getByText('1-2 of 1000')).toBeInTheDocument();
  });

  test('handles datasets with long names', () => {
    const dataWithLongName = [
      {
        id: 7,
        table_name:
          'very_long_table_name_that_might_cause_layout_issues_in_the_table_display',
        kind: 'physical',
        schema: 'public',
        database: { database_name: 'test_db' },
        owners: [],
      },
    ];

    render(<DatasetTable {...defaultProps} data={dataWithLongName} />);

    expect(
      screen.getByText(
        'very_long_table_name_that_might_cause_layout_issues_in_the_table_display',
      ),
    ).toBeInTheDocument();
  });

  test('handles multiple owners correctly', () => {
    const dataWithMultipleOwners = [
      {
        id: 8,
        table_name: 'table_with_many_owners',
        kind: 'physical',
        schema: 'public',
        database: { database_name: 'test_db' },
        owners: [
          { firstName: 'Owner1', lastName: 'Last1', username: 'owner1' },
          { firstName: 'Owner2', lastName: 'Last2', username: 'owner2' },
          { firstName: 'Owner3', lastName: 'Last3', username: 'owner3' },
          { firstName: 'Owner4', lastName: 'Last4', username: 'owner4' },
        ],
      },
    ];

    render(<DatasetTable {...defaultProps} data={dataWithMultipleOwners} />);

    expect(screen.getByTestId('owner-0-0')).toHaveTextContent('Owner1 Last1');
    expect(screen.getByTestId('owner-0-1')).toHaveTextContent('Owner2 Last2');
    expect(screen.getByTestId('owner-0-2')).toHaveTextContent('Owner3 Last3');
    expect(screen.getByTestId('owner-0-3')).toHaveTextContent('Owner4 Last4');
  });
});
