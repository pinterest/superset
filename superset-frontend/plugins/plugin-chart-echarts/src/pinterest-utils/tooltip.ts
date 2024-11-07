import {
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
  const previousDate = new Date(date);
  previousDate.setDate(date.getDate() - offsetDays);
  return previousDate;
};

export const getDateByTimeDelta = {
  [DeltaTableColumn.DayOverDay]: (date: Date) => getPreviousDate(date, 1),
  [DeltaTableColumn.WeekOverWeek]: (date: Date) => getPreviousDate(date, 7),
  [DeltaTableColumn.MonthOverMonth]: (date: Date) => getPreviousDate(date, 28),
  [DeltaTableColumn.YearOverYear]: (date: Date) => {
    const previousDate = new Date(date);
    previousDate.setFullYear(date.getFullYear() - 1);
    return previousDate;
  },
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

    const [queryData] = queriesData;
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

    const dataTypes = getColtypesMapping(queryData);
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

    const getDataPercentChange = (previousDate: Date) => {
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
    };

    const percentChangeByKey = deltaTableColumns.reduce(
      (accum, column) => {
        if (PERCENT_CHANGE_COLUMNS.includes(column)) {
          const previousDate = getDateByTimeDelta[column](currentDate);
          // eslint-disable-next-line no-param-reassign
          accum[column] = getDataPercentChange(previousDate);
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
          ${deltaTableRows
            .map(({ seriesId, columns }) => {
              const contentStyle =
                seriesId === focusedSeries
                  ? 'font-weight: 700'
                  : 'opacity: 0.7';
              return `<tr key={${seriesId}} style="${contentStyle}">${columns
                .map(
                  ({ element, style, data, key }) =>
                    `<${element} key={${key}} style=${style}>${data}</${element}>`,
                )
                .join('')}</tr>`;
            })
            .join('')}
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
