import {
  PostProcessingAnomalyDetection,
  getXAxisLabel,
} from '@superset-ui/core';
import { PostProcessingFactory } from './types';
import { AnomalyDetectionAlgorithm } from '../sections/anomalyDetectionAlgorithm';

/* eslint-disable @typescript-eslint/no-unused-vars */
export const anomalyDetectionOperator: PostProcessingFactory<
  PostProcessingAnomalyDetection
> = (formData, queryObject) => {
  const xAxisLabel = getXAxisLabel(formData);
  if (formData.anomalyDetectionEnabled && xAxisLabel) {
    const algorithm =
      formData.anomalyDetectionAlgorithm ||
      AnomalyDetectionAlgorithm.IsolationForest;

    if (algorithm === AnomalyDetectionAlgorithm.ZScore) {
      const options: NonNullable<PostProcessingAnomalyDetection>['options'] = {
        algorithm,
        z_score_threshold: parseFloat(formData.anomalyDetectionZScoreThreshold),
        index: xAxisLabel,
      };
      // Sliding window is optional; only send it when the user provided a value.
      const slidingWindow = parseInt(
        formData.anomalyDetectionSlidingWindow,
        10,
      );
      if (!Number.isNaN(slidingWindow)) {
        options.sliding_window = slidingWindow;
      }
      return { operation: 'anomaly_detection', options };
    }

    return {
      operation: 'anomaly_detection',
      options: {
        algorithm,
        contamination_rate: parseFloat(
          formData.anomalyDetectionContaminationRate,
        ),
        detrend: formData.anomalyDetectionDetrend,
        yearly_seasonality: formData.anomalyDetectionYearlySeasonality,
        monthly_seasonality: formData.anomalyDetectionMonthlySeasonality,
        weekly_seasonality: formData.anomalyDetectionWeeklySeasonality,
        index: xAxisLabel,
      },
    };
  }
  return undefined;
};
