import {
  ControlSetItem,
  ControlSetRow,
  formatSelectOptions,
} from '@superset-ui/chart-controls';
import { t } from '@superset-ui/core';
import { richTooltipControl, tooltipSortByMetricControl, tooltipTimeFormatControl } from "../../../controls";
import { DeltaTableColumn } from './types';

const tooltipDeltaColumns: ControlSetItem = {
    name: 'tooltipDeltaColumns',
    config: {
        type: 'SelectControl',
        freeForm: false,
        clearable: false,
        multi: true,
        label: t('Delta columns'),
        choices: formatSelectOptions([
            DeltaTableColumn.DAY_OVER_DAY,
            DeltaTableColumn.WEEK_OVER_WEEK,
            DeltaTableColumn.MONTH_OVER_MONTH,
            DeltaTableColumn.YEAR_OVER_YEAR,
        ]),
        default: [
            DeltaTableColumn.DAY_OVER_DAY,
            DeltaTableColumn.WEEK_OVER_WEEK,
            DeltaTableColumn.MONTH_OVER_MONTH,
            DeltaTableColumn.YEAR_OVER_YEAR,
        ],
        renderTrigger: true,
        description: t(
        'Delta columns to show on the rich tooltip (only shows delta columns if there is enough data to compute value)',
        ),
    },
};


export const richTooltipSection: ControlSetRow[] = [
  [<div className="section-header">{t('Tooltip')}</div>],
  [richTooltipControl],
  [tooltipSortByMetricControl],
  [tooltipDeltaColumns],
  [tooltipTimeFormatControl],
];