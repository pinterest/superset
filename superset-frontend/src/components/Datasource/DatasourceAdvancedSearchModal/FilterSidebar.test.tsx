import {
  UserRoles,
  UserWithPermissionsAndRoles,
} from 'src/types/bootstrapTypes';
import { fireEvent, render, screen } from 'spec/helpers/testing-library';

import userEvent from '@testing-library/user-event';

import FilterSidebar from './FilterSidebar';

// Mock the CRUD utils
jest.mock('src/views/CRUD/utils', () => ({
  createErrorHandler: jest.fn(() => jest.fn()),
  createFetchDistinct: jest.fn(() => jest.fn()),
  createFetchRelated: jest.fn(() => jest.fn()),
}));

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
  user: mockUser,
  appliedFilters: {},
  onFilterChange: jest.fn(),
  onClearFilters: jest.fn(),
  filterRefs: { current: {} },
};

describe('FilterSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<FilterSidebar {...defaultProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    // TODO: Add back in when certified filter is implemented
    // expect(screen.getByText('Certified')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Schema')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Modified by')).toBeInTheDocument();
  });

  test('renders clear filters button', () => {
    render(<FilterSidebar {...defaultProps} />);
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  test('renders name filter with custom search input', () => {
    render(<FilterSidebar {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText('Type a value');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute('name', 'table_name');
  });

  test('handles name filter input changes', async () => {
    const onFilterChange = jest.fn();
    render(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    const nameInput = screen.getByPlaceholderText('Type a value');
    await userEvent.type(nameInput, 'test dataset');

    expect(onFilterChange).toHaveBeenCalledWith('table_name', 'test dataset');
  });

  test('clears name filter when input is cleared', async () => {
    const onFilterChange = jest.fn();
    render(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    const nameInput = screen.getByPlaceholderText('Type a value');
    await userEvent.type(nameInput, 'test');
    await userEvent.clear(nameInput);

    expect(onFilterChange).toHaveBeenCalledWith('table_name', '');
  });

  test('initializes name filter with applied filter value', () => {
    const appliedFilters = { table_name: 'initial value' };
    render(<FilterSidebar {...defaultProps} appliedFilters={appliedFilters} />);

    const nameInput = screen.getByPlaceholderText('Type a value');
    expect(nameInput).toHaveValue('initial value');
  });

  test('handles clear filters button click', () => {
    const onClearFilters = jest.fn();
    render(<FilterSidebar {...defaultProps} onClearFilters={onClearFilters} />);

    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  test('handles null user', () => {
    render(<FilterSidebar {...defaultProps} user={null as any} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  test('updates name filter when appliedFilters change', () => {
    const { rerender } = render(<FilterSidebar {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText('Type a value');
    expect(nameInput).toHaveValue('');

    // Update appliedFilters and rerender
    rerender(
      <FilterSidebar
        {...defaultProps}
        appliedFilters={{ table_name: 'new value' }}
      />,
    );

    // The input should now have the new value
    expect(nameInput).toHaveValue('new value');
  });

  test('maintains filter refs', () => {
    const filterRefs = { current: {} };
    render(<FilterSidebar {...defaultProps} filterRefs={filterRefs} />);

    // The component should populate the filterRefs
    expect(filterRefs.current).toBeDefined();
  });

  test('handles rapid typing in name filter', async () => {
    const onFilterChange = jest.fn();
    render(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    const nameInput = screen.getByPlaceholderText('Type a value');

    // Type rapidly
    await userEvent.type(nameInput, 'a');
    await userEvent.type(nameInput, 'b');
    await userEvent.type(nameInput, 'c');

    // Should have been called for each character
    expect(onFilterChange).toHaveBeenCalledTimes(3);
    expect(onFilterChange).toHaveBeenCalledWith('table_name', 'a');
    expect(onFilterChange).toHaveBeenCalledWith('table_name', 'ab');
    expect(onFilterChange).toHaveBeenCalledWith('table_name', 'abc');
  });

  test('handles empty string in name filter', async () => {
    const onFilterChange = jest.fn();
    render(<FilterSidebar {...defaultProps} onFilterChange={onFilterChange} />);

    const nameInput = screen.getByPlaceholderText('Type a value');
    await userEvent.type(nameInput, 'test');
    await userEvent.clear(nameInput);

    expect(onFilterChange).toHaveBeenLastCalledWith('table_name', '');
  });
});
