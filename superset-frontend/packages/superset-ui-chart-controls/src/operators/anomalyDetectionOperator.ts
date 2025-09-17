import {
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
