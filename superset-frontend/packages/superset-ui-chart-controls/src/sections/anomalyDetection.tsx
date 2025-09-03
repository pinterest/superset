import { legacyValidateNumber, t } from '@superset-ui/core';
import { ControlPanelSectionConfig } from '../types';
import { displayTimeRelatedControls } from '../utils';

export const ANOMALY_DETECTION_DEFAULT_DATA = {
  anomalyDetectionEnabled: false,
  anomalyDetectionContaminationRate: 0.05,
  anomalyDetectionDetrend: true,
  anomalyDetectionYearlySeasonality: true,
  anomalyDetectionMonthlySeasonality: true,
  anomalyDetectionWeeklySeasonality: false,
};

export const anomalyDetectionControls: ControlPanelSectionConfig = {
  label: t('Warden Anomaly Detection'),
  description: t(
    'Detects time-series anomalies and assigns each a 0-1 score ' +
      "indicating confidence in it being a true anomaly (1 = very confident). " +
      'Excels at detecting local spikes and dips.',
  ),
  expanded: false,
  visibility: displayTimeRelatedControls,
  controlSetRows: [
    [
      {
        name: 'anomalyDetectionEnabled',
        config: {
          type: 'CheckboxControl',
          label: t('Enable anomaly detection'),
          renderTrigger: false,
          default: ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionEnabled,
          description: t('Enable anomaly detection for the data.'),
        },
      },
    ],
    [
      {
        name: 'anomalyDetectionContaminationRate',
        config: {
          type: 'TextControl',
          label: t(
            'What proportion of data points do you think could be anomalies?',
          ),
          validators: [legacyValidateNumber],
          default:
            ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionContaminationRate,
          description: t(
            'Usually somewhere between 0.01 to 0.05 (i.e. 1% to 5% of the data is anomalous).',
          ),
        },
      },
    ],
    [
      {
        name: 'anomalyDetectionDetrend',
        config: {
          type: 'CheckboxControl',
          label: t('Remove trend from data first'),
          renderTrigger: false,
          default: ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionDetrend,
          description: t(
            'Select this if your data is generally trending up or down, and you would like the anomaly detection model to NOT consider the trend when detecting anomalies. (This is especially useful if you want to detect local dips or spikes.)',
          ),
        },
      },
    ],
    [
      {
        name: 'anomalyDetectionYearlySeasonality',
        config: {
          type: 'CheckboxControl',
          label: t('Yearly seasonality'),
          renderTrigger: false,
          default:
            ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionYearlySeasonality,
          description: t(
            'Select this if the data behaves similarly the same time each year, and you would like the anomaly detection model to take that into account.',
          ),
        },
      },
    ],
    [
      {
        name: 'anomalyDetectionMonthlySeasonality',
        config: {
          type: 'CheckboxControl',
          label: t('Monthly seasonality'),
          renderTrigger: false,
          default:
            ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionMonthlySeasonality,
          description: t(
            'Select this if the data behaves similarly the same time each month, and you would like the anomaly detection model to take that into account.',
          ),
        },
      },
    ],
    [
      {
        name: 'anomalyDetectionWeeklySeasonality',
        config: {
          type: 'CheckboxControl',
          label: t('Weekly seasonality'),
          renderTrigger: false,
          default:
            ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionWeeklySeasonality,
          description: t(
            'Select this if the data behaves similarly the same time each week, and you would like the anomaly detection model to take that into account.',
          ),
        },
      },
    ],
  ],
};
