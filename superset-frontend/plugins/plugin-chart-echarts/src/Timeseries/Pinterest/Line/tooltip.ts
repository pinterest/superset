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
import { TooltipOption } from 'echarts/types/src/component/tooltip/TooltipModel';
import { getColtypesMapping } from '../../../utils/series';
import escape from 'escape-html';
import {
  DEFAULT_FORM_DATA,
  EchartsTimeseriesChartProps,
  EchartsTimeseriesFormData,
  OrientationType,
} from '../../types';
import {
  DELTA_TABLE_COLUMNS,
  DIRECTION_SYMBOL,
  MILLISECONDS_IN_DAY,
  PERCENT_CHANGE_COLUMNS,
  TIME_OFFSET_BY_COLUMN,
} from './constants';
import { getTooltipTimeFormatter } from '../../transformers';
import { defaultTooltip } from '../../../defaults';
import { DeltaDirection, DeltaTableColumn } from './types';

class DeltaTableTooltipFormatter {
  formData: EchartsTimeseriesFormData;

  dataByTimestamp: Record<number, TimeseriesDataRecord>;

  deltaTableColumns: DeltaTableColumn[];

  columnNameByVerboseName: Record<string, string>;

  timeFormatter: TimeFormatter | StringConstructor;

  theme: SupersetTheme;

  constructor(chartProps: EchartsTimeseriesChartProps) {
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
    const { data = [] } = queryData as TimeseriesChartDataResponseResult;
    this.dataByTimestamp = data.reduce((accum, curr) => {
      const timestamp = (curr[xAxisColName] as Date).valueOf();
      // eslint-disable-next-line no-param-reassign
      accum[timestamp] = curr;
      return accum;
    }, {});
    this.deltaTableColumns = this.getDeltaTableColumns();
    this.columnNameByVerboseName = Object.entries(verboseMap).reduce(
      (accum, [columnName, verboseName]) => {
        // eslint-disable-next-line no-param-reassign
        accum[verboseName] = columnName;
        return accum;
      },
      {},
    );

    const dataTypes = getColtypesMapping(queryData);
    const xAxisDataType = dataTypes?.[xAxisColName] ?? dataTypes?.[xAxisOrig];
    this.timeFormatter =
      xAxisDataType === GenericDataType.TEMPORAL
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
    const textAlign = column === DeltaTableColumn.METRIC ? 'left' : 'right';
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

  getDeltaTableData = (timestamp: number, seriesName: string) => {
    const columnName = this.getDataColumn(seriesName);
    const currentValue = this.dataByTimestamp[timestamp][columnName];

    const getDataPercentChange = (timeOffset: number) => {
      const originalTimestamp = timestamp - timeOffset * MILLISECONDS_IN_DAY;
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

    const percentChangeByKey = this.deltaTableColumns.reduce(
      (accum, column) => {
        if (PERCENT_CHANGE_COLUMNS.includes(column)) {
          const timeOffset = TIME_OFFSET_BY_COLUMN[column];
          // eslint-disable-next-line no-param-reassign
          accum[column] = getDataPercentChange(timeOffset);
        }
        return accum;
      },
      {},
    );

    return {
      ...percentChangeByKey,
      [DeltaTableColumn.METRIC]: seriesName,
      [DeltaTableColumn.VALUE]: (currentValue ?? 'null').toLocaleString(),
    };
  };

  getDeltaTableRows(params: CallbackDataParams[], xIndex: number) {
    const rows = [
      this.deltaTableColumns.map(column => ({
        element: 'th',
        style: this.getCellStyle(column),
        data: column.toString(),
      })),
    ];
    params.forEach((param) => {
      const deltaTableData = this.getDeltaTableData(
        param.value[xIndex],
        param.seriesName,
      );
      const newRow = this.deltaTableColumns.map(column => {
        const columnData = deltaTableData[column];
        let color;
        let data = columnData ?? 'N/A';
        if (column === DeltaTableColumn.METRIC) {
          data = param.marker + escape(columnData);
        }
        else if (PERCENT_CHANGE_COLUMNS.includes(column) && columnData != null) {
          data += '%';
          if (columnData > 0) {
            color = this.theme.colors.success.dark1;
            data += DIRECTION_SYMBOL[DeltaDirection.UP];
          } else if (columnData < 0) {
            color = this.theme.colors.error.dark1;
            data += DIRECTION_SYMBOL[DeltaDirection.DOWN];
          }
        }
        return {
          element: 'td',
          style: this.getCellStyle(column, color),
          data,
        };
      });
      rows.push(newRow);
    });
    return rows;
  }

  getTooltipConfig() {
    const { richTooltip, tooltipSortByMetric, orientation } = this.formData;

    const [xIndex, yIndex] =
      orientation === OrientationType.horizontal ? [1, 0] : [0, 1];

    let tooltipConfig: TooltipOption = {
      ...defaultTooltip,
      appendToBody: true,
      trigger: richTooltip ? 'axis' : 'item',
      // eslint-disable-next-line theme-colors/no-literal-colors
      backgroundColor: 'rgba(255, 255, 255, 0.90)',
      formatter: (initialParams: TooltipPositionCallbackParams) => {
        let params: CallbackDataParams[] = richTooltip
          ? (initialParams as CallbackDataParams[])
          : [initialParams as CallbackDataParams];
        if (tooltipSortByMetric) {
          params = orderBy(params, [
            ({ value }) => -1 * value[yIndex],
            ['desc'],
          ]) as CallbackDataParams[];
        }
        const deltaTableRows = this.getDeltaTableRows(params, xIndex);
        const xValue = params[0].value[xIndex];
        return `
        <span style="font-weight: 700">${this.timeFormatter(xValue)}</span>
        <br />
        <table>
          ${deltaTableRows
            .map(
              columns =>
                `<tr>${columns
                  .map(
                    ({ element, style, data }) =>
                      `<${element} style=${style}>${data}</${element}>`,
                  )
                  .join('')}</tr>`,
            )
            .join('')}
        </table>`;
      },
    };

    if (richTooltip) {
      tooltipConfig = {
        ...tooltipConfig,
        position: (
          pos: [number, number],
          _params: any,
          _el: any,
          _elRect: any,
          size: { viewSize: [number, number] },
        ) => {
          const obj = { top: 10 };
          obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
          return obj;
        },
      };
    }
    return tooltipConfig;
  }
}

export const getTooltipConfig = (chartProps: EchartsTimeseriesChartProps) => {
  const tooltipFormatter = new DeltaTableTooltipFormatter(chartProps);
  return tooltipFormatter.getTooltipConfig();
};
