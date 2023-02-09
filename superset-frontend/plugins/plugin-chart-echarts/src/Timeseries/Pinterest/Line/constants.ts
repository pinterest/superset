import { DeltaDirection, DeltaTableColumn } from './types';

export const TIME_OFFSET_BY_COLUMN = {
  [DeltaTableColumn.DAY_OVER_DAY]: 1,
  [DeltaTableColumn.WEEK_OVER_WEEK]: 7,
  [DeltaTableColumn.MONTH_OVER_MONTH]: 30,
  [DeltaTableColumn.YEAR_OVER_YEAR_364]: 364,
  [DeltaTableColumn.YEAR_OVER_YEAR_365]: 365,
};

export const DELTA_TABLE_COLUMNS = [
  DeltaTableColumn.METRIC,
  DeltaTableColumn.VALUE,
  DeltaTableColumn.DAY_OVER_DAY,
  DeltaTableColumn.WEEK_OVER_WEEK,
  DeltaTableColumn.MONTH_OVER_MONTH,
  DeltaTableColumn.YEAR_OVER_YEAR_364,
  DeltaTableColumn.YEAR_OVER_YEAR_365,
];

export const PERCENT_CHANGE_COLUMNS = [
  DeltaTableColumn.DAY_OVER_DAY,
  DeltaTableColumn.WEEK_OVER_WEEK,
  DeltaTableColumn.MONTH_OVER_MONTH,
  DeltaTableColumn.YEAR_OVER_YEAR_364,
  DeltaTableColumn.YEAR_OVER_YEAR_365,
];

export const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

export const DIRECTION_SYMBOL = {
  [DeltaDirection.UP]: '&uarr;',
  [DeltaDirection.DOWN]: '&darr;',
};
