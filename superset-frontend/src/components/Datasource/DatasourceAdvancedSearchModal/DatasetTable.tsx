import TableView, { EmptyWrapperType } from 'src/components/TableView';
import { styled, t } from '@superset-ui/core';

import FacePile from 'src/components/FacePile';
import Loading from 'src/components/Loading';
import { useMemo } from 'react';

const TableContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-x: auto;

  .superset-list-view {
    height: 100%;
  }

  table {
    min-width: 800px;
    table-layout: auto;
  }

  td,
  th {
    white-space: nowrap;
  }

  td:first-child,
  th:first-child {
    min-width: 200px;
  }
`;

export interface DatasetTableProps {
  loading: boolean;
  data: any[];
  pageSize: number;
  pageIndex: number;
  sortBy: any;
  totalCount: number;
  onSelectDatasource: (datasource: any) => void;
  onServerPagination: (args: any) => void;
}

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.gridUnit * 5}px;
  min-height: 0;
  overflow: hidden;
`;

const StyledSpan = styled.span`
  cursor: pointer;
  color: ${({ theme }) => theme.colors.primary.dark1};

  &:hover {
    color: ${({ theme }) => theme.colors.primary.dark2};
  }
`;

const DatasetTable: React.FC<DatasetTableProps> = ({
  loading,
  data,
  pageSize,
  pageIndex,
  sortBy,
  totalCount,
  onSelectDatasource,
  onServerPagination,
}) => {
  const tableColumns = useMemo(
    () => [
      {
        Cell: ({ row: { original } }: any) => (
          <StyledSpan
            role="button"
            tabIndex={0}
            data-test="datasource-link"
            onClick={() => onSelectDatasource({ type: 'table', ...original })}
            style={{
              whiteSpace: 'nowrap',
            }}
          >
            {original?.table_name}
          </StyledSpan>
        ),
        Header: t('Name'),
        accessor: 'table_name',
        minWidth: 200,
        width: 300,
      },
      {
        Cell: ({
          row: {
            original: { kind },
          },
        }: any) => (kind === 'physical' ? t('Physical') : t('Virtual')),
        Header: t('Type'),
        accessor: 'kind',
        disableSortBy: true,
        width: 100,
      },
      {
        Header: t('Schema'),
        accessor: 'schema',
        width: 150,
      },
      {
        Header: t('Database'),
        accessor: 'database.database_name',
        disableSortBy: true,
        width: 150,
      },
      {
        Cell: ({
          row: {
            original: { owners = [] },
          },
        }: any) => <FacePile users={owners} />,
        Header: t('Owners'),
        id: 'owners',
        disableSortBy: true,
        width: 120,
      },
    ],
    [onSelectDatasource],
  );

  return (
    <MainContent>
      <TableContainer>
        {loading ? (
          <Loading />
        ) : (
          <TableView
            columns={tableColumns}
            data={data}
            pageSize={pageSize}
            initialPageIndex={pageIndex}
            initialSortBy={sortBy}
            totalCount={totalCount}
            onServerPagination={onServerPagination}
            className="table-condensed"
            emptyWrapperType={EmptyWrapperType.Small}
            serverPagination
            isPaginationSticky
            scrollTable
          />
        )}
      </TableContainer>
    </MainContent>
  );
};

export default DatasetTable;
