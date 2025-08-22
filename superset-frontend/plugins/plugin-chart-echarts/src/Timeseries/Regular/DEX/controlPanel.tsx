import {
  ControlPanelConfig,
  ControlPanelState,
  ControlState,
  ControlSubSectionHeader,
  Dataset,
  SortSeriesType,
  TIME_FILTER_LABELS,
  dndGroupByControl,
  getStandardizedControls,
  xAxisMixin,
} from '@superset-ui/chart-controls';
import { t, validateNonEmpty } from '@superset-ui/core';

import { DEFAULT_FORM_DATA } from '../../constants';

const { rowLimit } = DEFAULT_FORM_DATA;
const DEFAULT_TIME_RANGE = 'Last week';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      expanded: true,
      controlSetRows: [
        [<ControlSubSectionHeader>{t('Metrics')}</ControlSubSectionHeader>],
        [
          {
            name: 'metrics',
            config: {
              type: 'DEXMetricControl',
              freeForm: false,
              multi: false,
              label: t('Metrics'),
              validators: [validateNonEmpty],
              renderTrigger: false,
              default: null,
            },
          },
        ],
        [
          {
            name: 'groupby',
            config: {
              type: 'SelectControl',
              freeForm: false,
              multi: true,
              limit: 1,
              label: t('Breakdown'),
              renderTrigger: false,
              default: null,
              description: t('Column to group by'),
              shouldMapStateToProps: () => true,
              mapStateToProps: (
                state: ControlPanelState,
                controlState: ControlState,
              ) => {
                const columns = (state.datasource as Dataset)?.columns || [];
                // TODO (kgopal): Change to use constant
                const reservedColumns = [
                  'dt',
                  'user_id',
                  'metric_type',
                  'metric_volume',
                ];
                return {
                  choices: columns
                    .filter(
                      c =>
                        c.filterable &&
                        !reservedColumns.includes(c.column_name),
                    )
                    .map(c => [c.column_name, c.verbose_name || c.column_name]),
                };
              },
            },
          },
        ],
        [<ControlSubSectionHeader>{t('Time')}</ControlSubSectionHeader>],
        [
          {
            name: 'x_axis',
            config: {
              ...dndGroupByControl,
              ...xAxisMixin,
              default: 'dt', // TODO (kgopal): Change to date column from constant
              type: 'HiddenControl',
            },
          },
        ],
        ['time_grain_sqla'],
        [
          {
            name: 'time_range',
            config: {
              type: 'DateFilterControl',
              freeForm: true,
              label: TIME_FILTER_LABELS.time_range,
              initialValue: DEFAULT_TIME_RANGE,
              description: t(
                'This control filters the whole chart based on the selected time range. All relative times, e.g. "Last month", ' +
                  '"Last 7 days", "now", etc. are evaluated on the server using the server\'s ' +
                  'local time (sans timezone). All tooltips and placeholder times are expressed ' +
                  'in UTC (sans timezone). The timestamps are then evaluated by the database ' +
                  "using the engine's local timezone. Note one can explicitly set the timezone " +
                  'per the ISO 8601 format if specifying either the start and/or end time.',
              ),
            },
          },
        ],
        [
          <ControlSubSectionHeader>
            {t('Time comparison')}
          </ControlSubSectionHeader>,
        ],
        [
          {
            name: 'time_compare',
            config: {
              type: 'SelectControl',
              multi: true,
              freeForm: true,
              label: t('Time shift'),
              choices: [
                ['1 day ago', t('1 day ago')],
                ['1 week ago', t('1 week ago')],
                ['28 days ago', t('28 days ago')],
                ['30 days ago', t('30 days ago')],
                ['52 weeks ago', t('52 weeks ago')],
                ['1 year ago', t('1 year ago')],
                ['104 weeks ago', t('104 weeks ago')],
                ['2 years ago', t('2 years ago')],
              ],
              description: t(
                'Overlay one or more timeseries from a ' +
                  'relative time period. Expects relative time deltas ' +
                  'in natural language (example: 24 hours ago, 7 days ago, ' +
                  '52 weeks ago, 1 year ago). Free text is supported.',
              ),
            },
          },
          {
            name: 'comparison_type',
            config: {
              type: 'SelectControl',
              label: t('Calculation type'),
              default: 'values',
              choices: [
                ['values', t('Actual values')],
                ['difference', t('Difference')],
                ['percentage', t('Percentage change')],
              ],
              description: t(
                'How to display time shifts: as individual lines; as the ' +
                  'difference between the main time series and each time shift; ' +
                  'as the percentage change; or as the ratio between series and time shifts.',
              ),
            },
          },
        ],
        [
          {
            name: 'adhoc_filters',
            config: {
              type: 'HiddenControl',
              label: t('Adhoc Filters'),
              hidden: true,
              description: t('Filters for time range'),
              initialValue: [
                {
                  clause: 'WHERE',
                  expressionType: 'SIMPLE',
                  subject: 'dt', // TODO (kgopal): Change to date column from constant
                  operator: 'TEMPORAL_RANGE',
                  comparator: DEFAULT_TIME_RANGE,
                },
              ],
            },
          },
        ],
        [
          {
            name: 'truncateYAxis',
            config: {
              type: 'HiddenControl',
              label: t('Truncate Y Axis'),
              hidden: true,
              description: t('Truncate Y Axis'),
              initialValue: true,
            },
          },
        ],
        [
          {
            name: 'legendOrientation',
            config: {
              type: 'HiddenControl',
              label: t('Legend Orientation'),
              hidden: true,
              description: t('Legend Orientation'),
              initialValue: 'right',
            },
          },
        ],
        [
          {
            name: 'tooltipSortByMetric',
            config: {
              type: 'HiddenControl',
              label: t('Tooltip Sort By Metric'),
              hidden: true,
              description: t('Tooltip Sort By Metric'),
              initialValue: true,
            },
          },
        ],
        [
          {
            name: 'sortSeriesType',
            config: {
              type: 'HiddenControl',
              label: t('Sort Series By'),
              hidden: true,
              description: t('Sort Series By'),
              initialValue: SortSeriesType.Max,
            },
          },
        ],
        [
          {
            name: 'truncate_metric',
            config: {
              type: 'HiddenControl',
              label: t('Truncate Metric'),
              hidden: true,
              description: t('Whether to truncate metrics'),
              initialValue: true,
            },
          },
        ],
      ],
    },
  ],
  controlOverrides: {
    row_limit: {
      default: rowLimit,
    },
  },
  formDataOverrides: formData => ({
    ...formData,
    metrics: getStandardizedControls().popAllMetrics(),
    groupby: getStandardizedControls().popAllColumns(),
  }),
};

export default config;
