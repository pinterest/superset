import {
  ControlPanelConfig,
  ControlPanelState,
  ControlState,
  ControlSubSectionHeader,
  Dataset,
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
        [<ControlSubSectionHeader>{t('Time')}</ControlSubSectionHeader>],
        [
          {
            name: 'x_axis',
            config: {
              ...dndGroupByControl,
              ...xAxisMixin,
              default: 'dt', // TODO (kgopal): Change to date column from constant
              visibility: () => false,
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
    truncateYAxis: true,
  }),
};

export default config;
