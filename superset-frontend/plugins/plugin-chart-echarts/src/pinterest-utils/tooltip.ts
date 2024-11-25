import {
  DataRecordValue,
  DTTM_ALIAS,
  GenericDataType,
  getColumnLabel,
  SupersetTheme,
  TimeFormatter,
  TimeseriesChartDataResponseResult,
  TimeseriesDataRecord,
} from '@superset-ui/core';
import { orderBy } from 'lodash';
import {
  CallbackDataParams,
  TooltipPositionCallbackParams,
} from 'echarts/types/src/util/types';
import escape from 'escape-html';
import { getColtypesMapping } from '../utils/series';
import { DEFAULT_FORM_DATA } from '../Timeseries/constants';
import {
  EchartsTimeseriesChartProps,
  EchartsTimeseriesFormData,
  OrientationType,
} from '../types';
import { EchartsMixedTimeseriesProps } from '../MixedTimeseries/types';
import {
  DELTA_TABLE_COLUMNS,
  DIRECTION_SYMBOL,
  MILLISECONDS_IN_DAY,
  PERCENT_CHANGE_COLUMNS,
  TIME_OFFSET_BY_COLUMN,
} from './constants';
import { getTooltipTimeFormatter } from '../utils/formatters';
import { DeltaDirection, DeltaTableColumn } from './types';

const getPreviousDate = (date: Date, offsetDays: number) => {
  // Convert the date to UTC time in milliseconds, subtract the offsetDays,
  // and return the new date. (UTC conversion is needed to avoid daylight savings issues)
  const time = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  // subtract offsetDays from the time in milliseconds
  const newTime = time - offsetDays * 24 * 60 * 60 * 1000;
  const newDate = new Date(newTime);
  return newDate;
};

export const getDateByTimeDelta = {
  [DeltaTableColumn.DayOverDay]: (date: Date) => getPreviousDate(date, 1),
  [DeltaTableColumn.WeekOverWeek]: (date: Date) => getPreviousDate(date, 7),
  [DeltaTableColumn.MonthOverMonth]: (date: Date) => getPreviousDate(date, 28),
  [DeltaTableColumn.YearOverYear364]: (date: Date) =>
    getPreviousDate(date, 364),
  [DeltaTableColumn.YearOverYear365]: (date: Date) =>
    getPreviousDate(date, 365),
} as Record<DeltaTableColumn, (date: Date) => Date>;

type DeltaTableTooltipColumn = {
  element: string;
  style: string;
  data: string | number;
  key: string;
};

type DeltaTableTooltipRow = {
  seriesId: string;
  columns: DeltaTableTooltipColumn[];
};

class DeltaTableTooltipFormatter {
  getFocusedSeries: () => string | null;

  formData: EchartsTimeseriesFormData;

  dataByTimestamp: Record<number, TimeseriesDataRecord>;

  deltaTableColumns: DeltaTableColumn[];

  columnNameByVerboseName: Record<string, string>;

  timeFormatter: TimeFormatter | StringConstructor;

  theme: SupersetTheme;

  constructor(
    chartProps: EchartsTimeseriesChartProps | EchartsMixedTimeseriesProps,
    getFocusedSeries: () => string | null,
    primarySeriesKeys?: Set<string>,
  ) {
    this.getFocusedSeries = getFocusedSeries;
    const { datasource, queriesData, theme } = chartProps;
    this.theme = theme;

    const formData = {
      ...DEFAULT_FORM_DATA,
      ...chartProps.formData,
    };
    this.formData = formData;
    const { xAxis: xAxisOrig, tooltipTimeFormat } = formData;

    const { verboseMap = {} } = datasource;
    const xAxisColName =
      verboseMap[xAxisOrig] || getColumnLabel(xAxisOrig || DTTM_ALIAS);

    this.dataByTimestamp = {} as Record<number, TimeseriesDataRecord>;
    queriesData.forEach((queryData, queryIdx) => {
      const { data = [] } = queryData as TimeseriesChartDataResponseResult;
      this.dataByTimestamp = data.reduce((accum, curr) => {
        const timestamp = (curr[xAxisColName] as Date).valueOf();
        if (queryIdx === 0) {
          // eslint-disable-next-line no-param-reassign
          accum[timestamp] = { ...curr };
        } else {
          Object.entries(curr).forEach(([key, value]) => {
            const currKey = primarySeriesKeys?.has(key)
              ? `${key} (${queryIdx})`
              : key;
            // eslint-disable-next-line no-param-reassign
            accum[timestamp][currKey] = curr[key];
          });
        }
        return accum;
      }, this.dataByTimestamp);
    });
    this.deltaTableColumns = this.getDeltaTableColumns();
    this.columnNameByVerboseName = Object.entries(verboseMap).reduce(
      (accum, [columnName, verboseName]) => {
        // eslint-disable-next-line no-param-reassign
        accum[verboseName] = columnName;
        return accum;
      },
      {} as Record<string, string>,
    );

    const queryDataA = queriesData[0];
    const dataTypes = getColtypesMapping(queryDataA);
    const xAxisDataType = dataTypes?.[xAxisColName] ?? dataTypes?.[xAxisOrig];
    this.timeFormatter =
      xAxisDataType === GenericDataType.Temporal
        ? getTooltipTimeFormatter(tooltipTimeFormat)
        : String;
  }

  getDeltaTableColumns() {
    const allTimestamps = Object.keys(this.dataByTimestamp).map(date => +date);
    const firstTimestamp = Math.min(...allTimestamps);
    const lastTimestamp = Math.max(...allTimestamps);
    const dataTimeRange =
      (lastTimestamp - firstTimestamp) / MILLISECONDS_IN_DAY;
    return DELTA_TABLE_COLUMNS.filter(
      col =>
        !PERCENT_CHANGE_COLUMNS.includes(col) ||
        TIME_OFFSET_BY_COLUMN[col] <= dataTimeRange,
    );
  }

  getCellStyle(column: string, color?: string) {
    const textAlign = column === DeltaTableColumn.Metric ? 'left' : 'right';
    let style = `padding:5px;text-align:${textAlign};`;
    if (color) {
      style += `color:${color};`;
    }
    return style;
  }

  getDataColumn = (seriesName: string) => {
    const sampleChartData = Object.values(this.dataByTimestamp)[0];
    if (!(seriesName in sampleChartData)) {
      return this.columnNameByVerboseName[seriesName];
    }
    return seriesName;
  };

  getDataPercentChange(
    columnName: string,
    currentValue: DataRecordValue,
    previousDate: Date,
  ) {
    const originalTimestamp = previousDate.valueOf();
    if (!(originalTimestamp in this.dataByTimestamp)) {
      return null;
    }
    const originalValue = this.dataByTimestamp[originalTimestamp][columnName];
    if (currentValue == null || !originalValue) {
      // Check to not divide by zero or use null values
      return null;
    }
    const proportionalChange =
      ((currentValue as number) - (originalValue as number)) /
      (originalValue as number);
    const percentChange = proportionalChange * 100;
    return Number(percentChange.toFixed(2));
  }

  getDeltaTableData = (
    timestamp: number,
    seriesName: string,
    overrideDeltaTableColumns?: Array<DeltaTableColumn>,
  ) => {
    const deltaTableColumns =
      overrideDeltaTableColumns ?? this.deltaTableColumns;
    const columnName = this.getDataColumn(seriesName);
    const currentValue = this.dataByTimestamp[timestamp][columnName];
    const currentDate = new Date(timestamp);

    const percentChangeByKey = deltaTableColumns.reduce(
      (accum, column) => {
        if (PERCENT_CHANGE_COLUMNS.includes(column)) {
          const previousDate = getDateByTimeDelta[column](currentDate);
          // eslint-disable-next-line no-param-reassign
          accum[column] = this.getDataPercentChange(
            columnName,
            currentValue,
            previousDate,
          );
        }
        return accum;
      },
      {} as Record<DeltaTableColumn, number | null>,
    );

    return {
      ...percentChangeByKey,
      [DeltaTableColumn.Metric]: seriesName,
      [DeltaTableColumn.Value]: (currentValue ?? 'null').toLocaleString(),
    };
  };

  getDeltaTableRows(
    params: CallbackDataParams[],
    xIndex: number,
  ): DeltaTableTooltipRow[] {
    const { pinterestDeltaTableColumns } = this.formData;
    const deltaTableColumns = this.deltaTableColumns.filter(
      column =>
        !PERCENT_CHANGE_COLUMNS.includes(column) ||
        pinterestDeltaTableColumns.includes(column),
    );
    const rows = [
      {
        seriesId: 'delta-table-header',
        columns: deltaTableColumns.map(column => ({
          element: 'th',
          style: this.getCellStyle(column),
          data: column,
          key: column,
        })),
      },
    ] as DeltaTableTooltipRow[];
    params.forEach(param => {
      const deltaTableData = this.getDeltaTableData(
        (param.value as number[])[xIndex],
        param.seriesId!,
        deltaTableColumns,
      );
      const newRowColumns = deltaTableColumns.map(column => {
        const columnData = deltaTableData[column];
        let color;
        let data = columnData ?? '-';
        if (column === DeltaTableColumn.Metric) {
          data = param.marker + escape(columnData?.toString());
        } else if (
          PERCENT_CHANGE_COLUMNS.includes(column) &&
          columnData != null
        ) {
          data += '%';
          if ((columnData as number) > 0) {
            color = this.theme.colors.success.dark1;
            data += DIRECTION_SYMBOL[DeltaDirection.Up];
          } else if ((columnData as number) < 0) {
            color = this.theme.colors.error.dark1;
            data += DIRECTION_SYMBOL[DeltaDirection.Down];
          }
        }
        return {
          element: 'td',
          style: this.getCellStyle(column, color),
          data,
          key: column,
        };
      });
      const newRow = {
        seriesId: param.seriesId!,
        columns: newRowColumns,
      };
      rows.push(newRow);
    });
    return rows;
  }

  createTableColumns(deltaTableColumns: DeltaTableTooltipColumn[]) {
    return deltaTableColumns
      .map(
        ({ element, style, data, key }) =>
          `<${element} key={${key}} style=${style}>${data}</${element}>`,
      )
      .join('');
  }

  createTableRow(
    deltaTableRows: DeltaTableTooltipRow[],
    focusedSeries: string | null,
  ) {
    return deltaTableRows
      .map(({ seriesId, columns }) => {
        const contentStyle =
          seriesId === focusedSeries ? 'font-weight: 700' : 'opacity: 0.7';
        return `<tr key={${seriesId}} style="${contentStyle}">${this.createTableColumns(
          columns,
        )}</tr>`;
      })
      .join('');
  }

  getTooltipFormatter() {
    const { richTooltip, tooltipSortByMetric, orientation } = this.formData;

    const [xIndex, yIndex] =
      orientation === OrientationType.Horizontal ? [1, 0] : [0, 1];

    return (initialParams: TooltipPositionCallbackParams) => {
      const focusedSeries = this.getFocusedSeries();
      let params: CallbackDataParams[] = richTooltip
        ? (initialParams as CallbackDataParams[])
        : [initialParams as CallbackDataParams];
      if (tooltipSortByMetric) {
        params = orderBy(params, [
          ({ value }: CallbackDataParams) => -1 * (value as number[])[yIndex],
          ['desc'],
        ]) as CallbackDataParams[];
      }
      const deltaTableRows = this.getDeltaTableRows(params, xIndex);
      const xValue = (params[0].value as number[])[xIndex];

      return `
        <span style="font-weight: 700">${this.timeFormatter(xValue)}</span>
        <br />
        <table>
          ${this.createTableRow(deltaTableRows, focusedSeries)}
        </table>`;
    };
  }
}

export const getDeltaTableTooltipFormatter = (
  chartProps: EchartsTimeseriesChartProps | EchartsMixedTimeseriesProps,
  getFocusedSeries: () => string | null,
  primarySeriesKeys?: Set<string>,
) => {
  const tooltipFormatter = new DeltaTableTooltipFormatter(
    chartProps,
    getFocusedSeries,
    primarySeriesKeys,
  );
  return tooltipFormatter.getTooltipFormatter();
};
