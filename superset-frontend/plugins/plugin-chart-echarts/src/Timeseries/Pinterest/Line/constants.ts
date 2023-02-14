import { DeltaDirection, DeltaTableColumn } from './types';

export const TIME_OFFSET_BY_COLUMN = {
  [DeltaTableColumn.DAY_OVER_DAY]: 1,
  [DeltaTableColumn.WEEK_OVER_WEEK]: 7,
  [DeltaTableColumn.MONTH_OVER_MONTH]: 28,
  [DeltaTableColumn.YEAR_OVER_YEAR]: 365,
}

const getPreviousDate = (date: Date, offsetDays: number) => {
  const previousDate = new Date(date);
  previousDate.setDate(date.getDate() - offsetDays);
  return previousDate;
}

export const getDateByTimeDelta = {
  [DeltaTableColumn.DAY_OVER_DAY]: (date: Date) => getPreviousDate(date, 1),
  [DeltaTableColumn.WEEK_OVER_WEEK]: (date: Date) => getPreviousDate(date, 7),
  [DeltaTableColumn.MONTH_OVER_MONTH]:  (date: Date) => getPreviousDate(date, 28),
  [DeltaTableColumn.YEAR_OVER_YEAR]:  (date: Date) => {
    const previousDate = new Date(date);
    previousDate.setFullYear(date.getFullYear() - 1 );
    return previousDate;
  },
};

export const DELTA_TABLE_COLUMNS = [
  DeltaTableColumn.METRIC,
  DeltaTableColumn.VALUE,
  DeltaTableColumn.DAY_OVER_DAY,
  DeltaTableColumn.WEEK_OVER_WEEK,
  DeltaTableColumn.MONTH_OVER_MONTH,
  DeltaTableColumn.YEAR_OVER_YEAR,
];

export const PERCENT_CHANGE_COLUMNS = [
  DeltaTableColumn.DAY_OVER_DAY,
  DeltaTableColumn.WEEK_OVER_WEEK,
  DeltaTableColumn.MONTH_OVER_MONTH,
  DeltaTableColumn.YEAR_OVER_YEAR,
];

export const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

export const DIRECTION_SYMBOL = {
  [DeltaDirection.UP]: '&uarr;',
  [DeltaDirection.DOWN]: '&darr;',
};
