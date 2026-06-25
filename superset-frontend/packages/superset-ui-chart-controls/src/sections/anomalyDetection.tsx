import {
  AnomalyDetectionAlgorithm,
  legacyValidateNumber,
  t,
} from '@superset-ui/core';
import {
  ControlPanelSectionConfig,
  ControlPanelsContainerProps,
  ControlStateMapping,
} from '../types';
import { displayTimeRelatedControls } from '../utils';

export const ANOMALY_DETECTION_DEFAULT_DATA = {
  anomalyDetectionEnabled: false,
  anomalyDetectionAlgorithm: AnomalyDetectionAlgorithm.IsolationForest,
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
const isAlgorithm = (
  controls: ControlStateMapping | undefined,
  algorithm: AnomalyDetectionAlgorithm,
) =>
  (controls?.anomalyDetectionAlgorithm?.value ??
    ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionAlgorithm) === algorithm;

const isEnabled = ({ controls }: ControlPanelsContainerProps) =>
  Boolean(controls?.anomalyDetectionEnabled?.value);

// Shows a control only when detection is enabled and the given algorithm is selected.
const isVisibleForAlgorithm =
  (algorithm: AnomalyDetectionAlgorithm) =>
  (props: ControlPanelsContainerProps) =>
    isEnabled(props) && isAlgorithm(props.controls, algorithm);

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
              AnomalyDetectionAlgorithm.IsolationForest,
              t('Isolation Forest / LOF'),
            ],
            [AnomalyDetectionAlgorithm.ZScore, t('Z-Score')],
          ],
          description: t(
            'Anomaly detection algorithm to run. Each algorithm exposes its own parameters below.',
          ),
          visibility: isEnabled,
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
          visibility: isVisibleForAlgorithm(
            AnomalyDetectionAlgorithm.IsolationForest,
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
          visibility: isVisibleForAlgorithm(
            AnomalyDetectionAlgorithm.IsolationForest,
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
          visibility: isVisibleForAlgorithm(
            AnomalyDetectionAlgorithm.IsolationForest,
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
          visibility: isVisibleForAlgorithm(
            AnomalyDetectionAlgorithm.IsolationForest,
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
          visibility: isVisibleForAlgorithm(
            AnomalyDetectionAlgorithm.IsolationForest,
          ),
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
          default:
            ANOMALY_DETECTION_DEFAULT_DATA.anomalyDetectionZScoreThreshold,
          description: t(
            'Flags a point as anomalous when its absolute z-score exceeds this value. ' +
              'Lower values are more sensitive; higher values are stricter. ' +
              'A common starting point is 3.',
          ),
          visibility: isVisibleForAlgorithm(AnomalyDetectionAlgorithm.ZScore),
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
            'Optional. Recomputes z-scores within local windows of this size and keeps the ' +
              'strongest score per point. Helps detect anomalies relative to nearby values, ' +
              'not just the full series. Leave blank to compute the z-score over the entire series.',
          ),
          visibility: isVisibleForAlgorithm(AnomalyDetectionAlgorithm.ZScore),
        },
      },
    ],
  ],
};
