import {
  AnomalyDetectionAlgorithm,
  PostProcessingAnomalyDetection,
  getXAxisLabel,
} from '@superset-ui/core';
import { PostProcessingFactory } from './types';

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

    // Isolation Forest is the default. Emit the original pre-multi-algorithm
    // payload shape (no `algorithm` key) so existing charts stay backward
    // compatible with backends that predate algorithm selection. The new
    // backend defaults to Isolation Forest when `algorithm` is absent.
    return {
      operation: 'anomaly_detection',
      options: {
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
