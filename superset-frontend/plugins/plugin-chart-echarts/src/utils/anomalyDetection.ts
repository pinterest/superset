import type { ScatterSeriesOption } from 'echarts';
import type { SupersetTheme } from '@superset-ui/core';
import { getDefaultTooltip } from './tooltip';
import type {
  Refs,
  DataRow,
  RawSeriesEntry,
  AnomalyLookup,
  AnomalyPoint,
} from '../types';

export const ANOMALY_SUFFIXES = {
  IS_ANOMALY: '_is_anomaly',
  ANOMALY_SCORE: '_anomaly_score',
} as const;

export const ANOMALY_SCORE_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.4,
  LOW: 0.2,
} as const;

export const ANOMALY_POINT_CONFIG = {
  baseSize: 6,
  zLevel: 1,
  symbol: 'circle',
  sizeAdjustmentFactor: 5,
} as const;

// the following two functions dynamically adjust the color and size
// of each anomaly point based on its anomaly score, which we expect to
// have already been normalized to between 0 and 1

export function getAdjustedAnomalyPointColor(
  score: number,
  theme: SupersetTheme,
): string {
  if (score > ANOMALY_SCORE_THRESHOLDS.HIGH) return theme.colors.error.base;
  if (score > ANOMALY_SCORE_THRESHOLDS.MEDIUM) return theme.colors.warning.base;
  if (score > ANOMALY_SCORE_THRESHOLDS.LOW) return theme.colors.alert.base;
  return theme.colors.alert.light1;
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

export function createAnomalyLookup(
  rawSeries: RawSeriesEntry[],
  seriesNameLookup: Record<string, string>,
): AnomalyLookup {
  const anomalyLookup: AnomalyLookup = {};

  rawSeries.forEach(entry => {
    const entryName = String(entry.name || '');
    const seriesName = seriesNameLookup[entryName] || entryName;

    if (
      seriesName.endsWith(ANOMALY_SUFFIXES.IS_ANOMALY) ||
      seriesName.endsWith(ANOMALY_SUFFIXES.ANOMALY_SCORE)
    ) {
      // remove suffix to get base series name
      const baseSeriesName = seriesName.replace(
        new RegExp(
          `${ANOMALY_SUFFIXES.IS_ANOMALY}$|${ANOMALY_SUFFIXES.ANOMALY_SCORE}$`,
        ),
        '',
      );

      if (!anomalyLookup[baseSeriesName]) {
        anomalyLookup[baseSeriesName] = {};
      }

      entry.data.forEach(([x, y]: [string | number, number]) => {
        if (!anomalyLookup[baseSeriesName][x]) {
          anomalyLookup[baseSeriesName][x] = { isAnomaly: 0, anomalyScore: 0 };
        }

        if (seriesName.endsWith(ANOMALY_SUFFIXES.IS_ANOMALY)) {
          anomalyLookup[baseSeriesName][x].isAnomaly = y;
        } else if (seriesName.endsWith(ANOMALY_SUFFIXES.ANOMALY_SCORE)) {
          anomalyLookup[baseSeriesName][x].anomalyScore = y;
        }
      });
    }
  });

  return anomalyLookup;
}

export function extractAnomaliesForSeries(
  seriesData: DataRow[],
  seriesName: string,
  anomalyLookup: AnomalyLookup,
): AnomalyPoint[] {
  const anomalies: AnomalyPoint[] = [];
  const seriesAnomalyLabel = anomalyLookup[seriesName] || {};

  seriesData.forEach(([x, y]: [string | number, number]) => {
    const anomalyLabel = seriesAnomalyLabel[x];
    if (anomalyLabel && anomalyLabel.isAnomaly === 1) {
      anomalies.push({
        coord: [x, y],
        value: y,
        tooltip: `Anomaly Score: ${anomalyLabel.anomalyScore}`,
      });
    }
  });

  return anomalies;
}

export function isSeriesAboutAnomaly(seriesName: string): boolean {
  return (
    seriesName.endsWith(ANOMALY_SUFFIXES.IS_ANOMALY) ||
    seriesName.endsWith(ANOMALY_SUFFIXES.ANOMALY_SCORE)
  );
}

export function createAnomalyScatterSeries(
  seriesName: string,
  anomalies: AnomalyPoint[],
  anomalyLookup: AnomalyLookup,
  tooltipFormatter:
    | ((value: number | Date | null | undefined) => string)
    | ((value: string | number) => string),
  refs: Refs,
  inContextMenu: boolean,
  theme: SupersetTheme,
): ScatterSeriesOption {
  return {
    name: `${seriesName} - Anomalies`,
    type: 'scatter',
    data: anomalies.map(a => {
      const anomalyLabel = anomalyLookup[seriesName]?.[a.coord[0]];
      const score = anomalyLabel?.anomalyScore || 0;

      return {
        value: a.coord,
        anomalyScore: score,
        itemStyle: {
          color: getAdjustedAnomalyPointColor(score, theme),
        },
        symbolSize: getAdjustedAnomalyPointSize(
          score,
          ANOMALY_POINT_CONFIG.baseSize,
        ),
      };
    }),
    symbol: ANOMALY_POINT_CONFIG.symbol,
    zlevel: ANOMALY_POINT_CONFIG.zLevel,
    tooltip: {
      ...getDefaultTooltip(refs),
      show: !inContextMenu,
      trigger: 'item',
      formatter: (params: any) => {
        const { value, anomalyScore } = params.data;
        const [xValue, yValue] = value;
        const anomalyLabel = anomalyLookup[seriesName]?.[xValue];

        if (anomalyLabel) {
          const anomalyColor = getAdjustedAnomalyPointColor(
            anomalyScore,
            theme,
          );
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
        }
        return `Anomaly: ${yValue}`;
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

    const anomalies = extractAnomaliesForSeries(
      entry.data,
      seriesName,
      anomalyLookup,
    );
    if (anomalies.length > 0) {
      const anomalySeries = createAnomalyScatterSeries(
        seriesName,
        anomalies,
        anomalyLookup,
        tooltipFormatter,
        refs,
        inContextMenu,
        theme,
      );
      anomalyScatterSeries.push(anomalySeries);
    }
  });

  return anomalyScatterSeries;
}
