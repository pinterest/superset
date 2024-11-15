import { DeltaDirection, DeltaTableColumn } from './types';

export const TIME_OFFSET_BY_COLUMN = {
  [DeltaTableColumn.DayOverDay]: 1,
  [DeltaTableColumn.WeekOverWeek]: 7,
  [DeltaTableColumn.MonthOverMonth]: 28,
  [DeltaTableColumn.YearOverYear364]: 364,
  [DeltaTableColumn.YearOverYear365]: 365,
} as Record<DeltaTableColumn, number>;

export const DELTA_TABLE_COLUMNS = [
  DeltaTableColumn.Metric,
  DeltaTableColumn.Value,
  DeltaTableColumn.DayOverDay,
  DeltaTableColumn.WeekOverWeek,
  DeltaTableColumn.MonthOverMonth,
  DeltaTableColumn.YearOverYear364,
  DeltaTableColumn.YearOverYear365,
];

export const PERCENT_CHANGE_COLUMNS = [
  DeltaTableColumn.DayOverDay,
  DeltaTableColumn.WeekOverWeek,
  DeltaTableColumn.MonthOverMonth,
  DeltaTableColumn.YearOverYear364,
  DeltaTableColumn.YearOverYear365,
];

export const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

export const DIRECTION_SYMBOL = {
  [DeltaDirection.Up]: '&uarr;',
  [DeltaDirection.Down]: '&darr;',
};

export const PINTEREST_DEFAULT_FORM_DATA = {
  pinterestDeltaTable: false,
  pinterestDeltaTableColumns: [
    DeltaTableColumn.DayOverDay,
    DeltaTableColumn.WeekOverWeek,
    DeltaTableColumn.MonthOverMonth,
    DeltaTableColumn.YearOverYear364,
    DeltaTableColumn.YearOverYear365,
  ],
};
