import { legacyValidateNumber, t } from '@superset-ui/core';
import { ControlPanelSectionConfig, ControlStateMapping } from '../types';
import { displayTimeRelatedControls } from '../utils';

export const ANOMALY_DETECTION_ALGORITHM_ISOLATION_FOREST = 'isolation_forest';
export const ANOMALY_DETECTION_ALGORITHM_Z_SCORE = 'z_score';

export const ANOMALY_DETECTION_DEFAULT_DATA = {
  anomalyDetectionEnabled: false,
  anomalyDetectionAlgorithm: ANOMALY_DETECTION_ALGORITHM_ISOLATION_FOREST,
  // Isolation forest / LOF
  anomalyDetectionContaminationRate: 0.05,
  anomalyDetectionDetrend: true,
  anomalyDetectionYearlySeasonality: true,
  anomalyDetectionMonthlySeasonality: true,
  anomalyDetectionWeeklySeasonality: false,
  // Z-score
  anomalyDetectionZScoreThreshold: 3,
  anomalyDetectionSlidingWindow: null,
};

// Visibility helpers: the algorithm selector swaps which parameter inputs show.
const isAlgorithm = (controls: ControlStateMapping | undefined, algorithm: string) =>
  (controls?.anomalyDetectionAlgorithm?.value ??
    ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionAlgorithm) === algorithm;

export const anomalyDetectionControls: ControlPanelSectionConfig = {
  label: t('Warden Anomaly Detection'),
  description: t(
    'Detects time-series anomalies and assigns each a 0-1 score ' +
      'indicating confidence in it being a true anomaly (1 = very confident). ' +
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
        name: 'anomalyDetectionAlgorithm',
        config: {
          type: 'SelectControl',
          label: t('Algorithm'),
          renderTrigger: false,
          clearable: false,
          default: ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionAlgorithm,
          choices: [
            [
              ANOMALY_DETECTION_ALGORITHM_ISOLATION_FOREST,
              t('Isolation Forest / LOF'),
            ],
            [ANOMALY_DETECTION_ALGORITHM_Z_SCORE, t('Z-Score')],
          ],
          description: t(
            'Anomaly detection algorithm to run. Each algorithm exposes its own parameters below.',
          ),
          visibility: ({ controls }) =>
            Boolean(controls?.anomalyDetectionEnabled?.value),
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
          visibility: ({ controls }) =>
            Boolean(controls?.anomalyDetectionEnabled?.value) &&
            isAlgorithm(controls, ANOMALY_DETECTION_ALGORITHM_ISOLATION_FOREST),
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
          visibility: ({ controls }) =>
            Boolean(controls?.anomalyDetectionEnabled?.value) &&
            isAlgorithm(controls, ANOMALY_DETECTION_ALGORITHM_ISOLATION_FOREST),
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
          visibility: ({ controls }) =>
            Boolean(controls?.anomalyDetectionEnabled?.value) &&
            isAlgorithm(controls, ANOMALY_DETECTION_ALGORITHM_ISOLATION_FOREST),
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
          visibility: ({ controls }) =>
            Boolean(controls?.anomalyDetectionEnabled?.value) &&
            isAlgorithm(controls, ANOMALY_DETECTION_ALGORITHM_ISOLATION_FOREST),
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
          visibility: ({ controls }) =>
            Boolean(controls?.anomalyDetectionEnabled?.value) &&
            isAlgorithm(controls, ANOMALY_DETECTION_ALGORITHM_ISOLATION_FOREST),
        },
      },
    ],
    [
      {
        name: 'anomalyDetectionZScoreThreshold',
        config: {
          type: 'TextControl',
          label: t('Z-score threshold'),
          validators: [legacyValidateNumber],
          default: ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionZScoreThreshold,
          description: t(
            'A data point is flagged as an anomaly when the absolute value of its z-score exceeds this threshold. A common starting point is 3.',
          ),
          visibility: ({ controls }) =>
            Boolean(controls?.anomalyDetectionEnabled?.value) &&
            isAlgorithm(controls, ANOMALY_DETECTION_ALGORITHM_Z_SCORE),
        },
      },
    ],
    [
      {
        name: 'anomalyDetectionSlidingWindow',
        config: {
          type: 'TextControl',
          label: t('Sliding window'),
          validators: [legacyValidateNumber],
          default: ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionSlidingWindow,
          description: t(
            'Optional. Number of data points in the local window used to compute the z-score. Leave blank to compute the z-score over the entire series.',
          ),
          visibility: ({ controls }) =>
            Boolean(controls?.anomalyDetectionEnabled?.value) &&
            isAlgorithm(controls, ANOMALY_DETECTION_ALGORITHM_Z_SCORE),
        },
      },
    ],
  ],
};
