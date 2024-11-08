import React from 'react';
import { t, validateNonEmpty } from '@superset-ui/core';
import {
  formatSelectOptions,
  ControlSetRow,
  ControlSubSectionHeader,
  ControlPanelsContainerProps,
} from '@superset-ui/chart-controls';
import { DeltaTableColumn } from './types';
import { PINTEREST_DEFAULT_FORM_DATA } from './constants';

export const pinterestCustomConfig: ControlSetRow[] = [
  [<ControlSubSectionHeader>Pinterest Settings</ControlSubSectionHeader>],
  [
    {
      name: 'pinterestDeltaTable',
      config: {
        type: 'CheckboxControl',
        label: 'Pinterest Delta Table',
        default: PINTEREST_DEFAULT_FORM_DATA.pinterestDeltaTable,
        renderTrigger: true,
        description: t(
          'Show a rich tooltip with time comparisons of metrics (similar to the Pinalytics delta table)',
        ),
      },
    },
  ],
  [
    {
      name: 'pinterestDeltaTableColumns',
      config: {
        type: 'SelectControl',
        freeForm: false,
        clearable: false,
        multi: true,
        label: t('Delta columns'),
        choices: formatSelectOptions([
          DeltaTableColumn.DayOverDay,
          DeltaTableColumn.WeekOverWeek,
          DeltaTableColumn.MonthOverMonth,
          DeltaTableColumn.YearOverYear,
        ]),
        default: PINTEREST_DEFAULT_FORM_DATA.pinterestDeltaTableColumns,
        renderTrigger: true,
        description: t(
          'Delta columns to show on the rich tooltip (only shows delta columns if there is enough data to compute value)',
        ),
        validators: [validateNonEmpty],
        visibility: ({ controls }: ControlPanelsContainerProps) =>
          Boolean(controls?.pinterestDeltaTable?.value),
      },
    },
  ],
];
