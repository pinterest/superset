import type { ScatterSeriesOption } from 'echarts';
import type { SupersetTheme } from '@superset-ui/core';
import { getDefaultTooltip } from './tooltip';
import type { Refs, RawSeriesEntry, AnomalyLookup } from '../types';

export const ANOMALY_SUFFIXES = {
  IS_ANOMALY: '_is_anomaly',
  ANOMALY_SCORE: '_anomaly_score',
} as const;

export const ANOMALY_SCORE_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.3,
} as const;

export const ANOMALY_POINT_CONFIG = {
  baseSize: 6,
  zLevel: 1,
  symbol: 'circle',
  sizeAdjustmentFactor: 4,
} as const;

export const DEFAULT_ANOMALY_SCORE = 0.5;

// the following two functions dynamically adjust the color and size
// of each anomaly point based on its anomaly score, which we expect to
// have already been normalized to between 0 and 1

export function getAdjustedAnomalyPointColor(
  score: number,
  theme: SupersetTheme,
): string {
  if (score >= ANOMALY_SCORE_THRESHOLDS.HIGH) return theme.colors.error.base;
  if (score >= ANOMALY_SCORE_THRESHOLDS.MEDIUM)
    return theme.colors.warning.base;
  return theme.colors.alert.base;
}

export function getAdjustedAnomalyPointSize(
  score: number,
  baseSize: number,
): number {
  return Math.max(
    baseSize,
    baseSize + score * ANOMALY_POINT_CONFIG.sizeAdjustmentFactor,
  );
}

export function isSeriesAboutAnomaly(seriesName: string): boolean {
  return (
    seriesName.endsWith(ANOMALY_SUFFIXES.IS_ANOMALY) ||
    seriesName.endsWith(ANOMALY_SUFFIXES.ANOMALY_SCORE)
  );
}

export function createAnomalyLookup(
  rawSeries: RawSeriesEntry[],
  seriesNameLookup: Record<string, string>,
): AnomalyLookup {
  const seriesLookup = new Map<string, RawSeriesEntry>();
  rawSeries.forEach(entry => {
    const entryName = String(entry.name || '');
    const seriesName = seriesNameLookup[entryName] || entryName;
    seriesLookup.set(seriesName, entry);
  });

  const anomalyLookup: AnomalyLookup = {};
  rawSeries.forEach(entry => {
    const entryName = String(entry.name || '');
    const seriesName = seriesNameLookup[entryName] || entryName;
    if (isSeriesAboutAnomaly(seriesName)) {
      return;
    }

    const anomalyFlagSeriesName = `${seriesName}${ANOMALY_SUFFIXES.IS_ANOMALY}`;
    const anomalyFlagSeries = seriesLookup.get(anomalyFlagSeriesName);
    if (!anomalyFlagSeries) {
      return;
    }
    // set of x-values for anomalies
    const anomalyXValues = new Set<string | number>();
    anomalyFlagSeries.data.forEach(
      ([x, isAnomaly]: [string | number, number]) => {
        if (isAnomaly === 1) {
          anomalyXValues.add(x);
        }
      },
    );

    const anomalyScoreSeriesName = `${seriesName}${ANOMALY_SUFFIXES.ANOMALY_SCORE}`;
    const anomalyScoreSeries = seriesLookup.get(anomalyScoreSeriesName);
    // maps x-values to anomaly scores
    const anomalyScoreLookup = new Map<string | number, number>();
    if (anomalyScoreSeries) {
      anomalyScoreSeries.data.forEach(
        ([x, score]: [string | number, number]) => {
          anomalyScoreLookup.set(x, score);
        },
      );
    }

    anomalyLookup[seriesName] = new Map();
    entry.data.forEach(([x, y]: [string | number, number]) => {
      if (anomalyXValues.has(x)) {
        anomalyLookup[seriesName].set(x, {
          y,
          score: anomalyScoreLookup.get(x) ?? DEFAULT_ANOMALY_SCORE,
        });
      }
    });
  });

  return anomalyLookup;
}

export function createAnomalyScatterSeries(
  seriesName: string,
  anomalyLookup: AnomalyLookup,
  tooltipFormatter:
    | ((value: number | Date | null | undefined) => string)
    | ((value: string | number) => string),
  refs: Refs,
  inContextMenu: boolean,
  theme: SupersetTheme,
): ScatterSeriesOption {
  const anomalyData: any[] = [];
  const seriesAnomalies = anomalyLookup[seriesName] || new Map();

  seriesAnomalies.forEach(({ y, score }, x) => {
    anomalyData.push({
      value: [x, y],
      anomalyScore: score,
      itemStyle: {
        color: getAdjustedAnomalyPointColor(score, theme),
      },
      symbolSize: getAdjustedAnomalyPointSize(
        score,
        ANOMALY_POINT_CONFIG.baseSize,
      ),
    });
  });

  return {
    name: `${seriesName} - Anomalies`,
    type: 'scatter',
    data: anomalyData,
    symbol: ANOMALY_POINT_CONFIG.symbol,
    zlevel: ANOMALY_POINT_CONFIG.zLevel,
    tooltip: {
      ...getDefaultTooltip(refs),
      show: !inContextMenu,
      trigger: 'item',
      formatter: (params: any) => {
        const { value, anomalyScore } = params.data;
        const [xValue, yValue] = value;
        const anomalyColor = getAdjustedAnomalyPointColor(anomalyScore, theme);

        return `
          <div style="text-align: left; padding: 8px;">
            <div style="color: ${
              theme.colors.error.base
            }; font-weight: bold; margin-bottom: 4px;">
              🚨 Anomaly Detected
            </div>
            <div><strong>Series:</strong> ${seriesName}</div>
            <div><strong>Time:</strong> ${tooltipFormatter(xValue)}</div>
            <div><strong>Value:</strong> ${yValue.toLocaleString()}</div>
            <div style="color: ${anomalyColor}; font-weight: bold;">
              <strong>Anomaly Score:</strong> ${anomalyScore?.toFixed(3)}
            </div>
          </div>
        `;
      },
    },
  };
}

export function processAnomaliesForChart(
  rawSeries: RawSeriesEntry[],
  seriesNameLookup: Record<string, string>,
  anomalyLookup: AnomalyLookup,
  tooltipFormatter:
    | ((value: number | Date | null | undefined) => string)
    | ((value: string | number) => string),
  refs: Refs,
  inContextMenu: boolean,
  theme: SupersetTheme,
): ScatterSeriesOption[] {
  const anomalyScatterSeries: ScatterSeriesOption[] = [];

  rawSeries.forEach(entry => {
    const entryName = String(entry.name || '');
    const seriesName = seriesNameLookup[entryName] || entryName;

    if (isSeriesAboutAnomaly(seriesName)) {
      return;
    }

    if (anomalyLookup[seriesName] && anomalyLookup[seriesName].size > 0) {
      const anomalySeries = createAnomalyScatterSeries(
        seriesName,
        anomalyLookup,
        tooltipFormatter,
        refs,
        inContextMenu,
        theme,
      );
      if (anomalySeries.data && anomalySeries.data.length > 0) {
        anomalyScatterSeries.push(anomalySeries);
      }
    }
  });

  return anomalyScatterSeries;
}
