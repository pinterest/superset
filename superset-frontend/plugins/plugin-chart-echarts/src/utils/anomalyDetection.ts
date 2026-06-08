import type { ScatterSeriesOption } from 'echarts';
import type { SupersetTheme } from '@superset-ui/core';
import { getDefaultTooltip } from './tooltip';
import { sanitizeHtml } from './series';
import type {
  Refs,
  RawSeriesEntry,
  AnomalyLookup,
  AnomalyPointMeta,
} from '../types';

export const ANOMALY_SUFFIXES = {
  IS_ANOMALY: '_is_anomaly',
  ANOMALY_SCORE: '_anomaly_score',
  ANOMALY_EXPLANATION: '_anomaly_explanation',
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
  // theme.colors.alert was removed from SupersetTheme
  return theme.colors.info.base;
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
    seriesName.endsWith(ANOMALY_SUFFIXES.ANOMALY_SCORE) ||
    seriesName.endsWith(ANOMALY_SUFFIXES.ANOMALY_EXPLANATION)
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

    const anomalyExplanationSeriesName = `${seriesName}${ANOMALY_SUFFIXES.ANOMALY_EXPLANATION}`;
    const anomalyExplanationSeries = seriesLookup.get(
      anomalyExplanationSeriesName,
    );
    const anomalyExplanationLookup = new Map<string | number, string>();
    if (anomalyExplanationSeries) {
      anomalyExplanationSeries.data.forEach(row => {
        const [x, expl] = row as [string | number, string | number | null];
        if (expl === null || expl === undefined) {
          return;
        }
        const text = String(expl).trim();
        if (text.length > 0) {
          anomalyExplanationLookup.set(x, text);
        }
      });
    }

    anomalyLookup[seriesName] = new Map();
    entry.data.forEach(([x, y]: [string | number, number]) => {
      if (anomalyXValues.has(x)) {
        const point: AnomalyPointMeta = {
          y,
          score: anomalyScoreLookup.get(x) ?? DEFAULT_ANOMALY_SCORE,
        };
        const explanation = anomalyExplanationLookup.get(x);
        if (explanation !== undefined) {
          point.explanation = explanation;
        }
        anomalyLookup[seriesName].set(x, point);
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

  seriesAnomalies.forEach(({ y, score, explanation }, x) => {
    anomalyData.push({
      value: [x, y],
      anomalyScore: score,
      anomalyExplanation: explanation,
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
        const anomalyExplanation = params.data?.anomalyExplanation as
          | string
          | undefined;
        const [xValue, yValue] = value;
        const anomalyColor = getAdjustedAnomalyPointColor(anomalyScore, theme);
        const safeSeries = sanitizeHtml(String(seriesName));
        const explanationBlock =
          typeof anomalyExplanation === 'string' &&
          anomalyExplanation.length > 0
            ? `<div style="margin-top: 8px;"><strong>Explanation:</strong><div style="max-width: 260px; margin-top: 4px; white-space: pre-line; word-break: break-word; line-height: 1.45;">${sanitizeHtml(
                anomalyExplanation,
              )}</div></div>`
            : '';

        return `
          <div style="text-align: left; padding: 8px; max-width: 280px;">
            <div style="color: ${
              theme.colors.error.base
            }; font-weight: bold; margin-bottom: 4px;">
              🚨 Anomaly Detected
            </div>
            <div><strong>Series:</strong> ${safeSeries}</div>
            <div><strong>Time:</strong> ${sanitizeHtml(
              String(tooltipFormatter(xValue)),
            )}</div>
            <div><strong>Value:</strong> ${sanitizeHtml(
              String(yValue.toLocaleString()),
            )}</div>
            <div style="color: ${anomalyColor}; font-weight: bold;">
              <strong>Anomaly Score:</strong> ${anomalyScore?.toFixed(3)}
            </div>
            ${explanationBlock}
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
