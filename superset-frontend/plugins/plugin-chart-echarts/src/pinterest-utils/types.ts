export enum DeltaTableColumn {
  Metric = 'Metric',
  Value = 'Value',
  DayOverDay = 'D/D',
  WeekOverWeek = 'W/W',
  MonthOverMonth = 'M/M',
  YearOverYear = 'Y/Y',
}
export enum DeltaDirection {
  Up = 'Up',
  Down = 'Down',
}

export type PinterestFormData = {
  pinterestDeltaTable: boolean;
  pinterestDeltaTableColumns: DeltaTableColumn[];
};
