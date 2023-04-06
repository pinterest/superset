import React, { useCallback, useMemo, SetStateAction, Dispatch } from 'react';
import { t } from '@superset-ui/core';
import { Select } from 'src/components';
import { TableOption } from 'src/components/TableSelector';
import { Table } from 'src/hooks/apiResources';
import { DatasetActionType } from 'src/views/CRUD/data/dataset/AddDataset/types';

const SEARCH_TABLES_PLACEHOLDER_TEXT = t('Search tables');

export interface DatasetTableSelectorProps {
  tableList: Table[];
  datasetNames: (string | null | undefined)[] | undefined;
  setDataset: Dispatch<SetStateAction<object>>;
}

export default function DatasetTableSelector({
  tableList,
  datasetNames,
  setDataset,
}: DatasetTableSelectorProps) {
  const tableOptions: TableOption[] = useMemo(
    () =>
      tableList.map((originalTable: Table) => {
        const table = originalTable;
        if (
          datasetNames?.includes(table.value) &&
          !table?.extra?.warning_markdown
        ) {
          table.extra = table.extra ?? {};
          table.extra.warning_markdown = t('This table already has a dataset');
        }
        const option: TableOption = {
          value: table.value,
          label: <TableOption table={table} />,
          text: table.label,
        };

        return option;
      }),
    [datasetNames, tableList],
  );

  const setTable = useCallback(
    (tableName: string) => {
      setDataset({
        type: DatasetActionType.selectTable,
        payload: { name: 'table_name', value: tableName },
      });
    },
    [setDataset],
  );

  return (
    <Select
      ariaLabel={SEARCH_TABLES_PLACEHOLDER_TEXT}
      placeholder={SEARCH_TABLES_PLACEHOLDER_TEXT}
      name="select-table"
      options={tableOptions}
      onChange={setTable}
    />
  );
}
