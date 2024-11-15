export enum DeltaTableColumn {
  Metric = 'Metric',
  Value = 'Value',
  DayOverDay = 'D/D',
  WeekOverWeek = 'W/W',
  MonthOverMonth = 'M/M',
  YearOverYear364 = 'Y/Y (364 days)',
  YearOverYear365 = 'Y/Y (365 days)',
}
export enum DeltaDirection {
  Up = 'Up',
  Down = 'Down',
}

export type PinterestFormData = {
  pinterestDeltaTable: boolean;
  pinterestDeltaTableColumns: DeltaTableColumn[];
};
