import { SupersetTheme } from '@superset-ui/core';
import {
  ANOMALY_POINT_CONFIG,
  DEFAULT_ANOMALY_SCORE,
  isSeriesAboutAnomaly,
  createAnomalyLookup,
  createAnomalyScatterSeries,
  processAnomaliesForChart,
} from '../../src/utils/anomalyDetection';
import type { RawSeriesEntry, AnomalyLookup, Refs } from '../../src/types';

const mockTheme: SupersetTheme = {
  colors: {
    error: { base: '#ff4d4f' },
    warning: { base: '#faad14' },
    info: { base: '#52c41a' },
  },
} as SupersetTheme;

const mockRefs: Refs = {
  echartRef: { current: null },
  divRef: { current: null },
};

const mockTooltipFormatter = (value: string | number) => String(value);

describe('anomalyDetection utils', () => {
  describe('isSeriesAboutAnomaly', () => {
    it('should return true for anomaly flag series', () => {
      expect(isSeriesAboutAnomaly('metric1_is_anomaly')).toBe(true);
    });

    it('should return true for anomaly score series', () => {
      expect(isSeriesAboutAnomaly('metric1_anomaly_score')).toBe(true);
    });

    it('should return false for regular series', () => {
      expect(isSeriesAboutAnomaly('metric1')).toBe(false);
    });

    it('should return false for series that partially match suffixes', () => {
      expect(isSeriesAboutAnomaly('metric1_is_anomaly_extra')).toBe(false);
      expect(isSeriesAboutAnomaly('metric1_anomaly_score_extra')).toBe(false);
    });
  });

  describe('createAnomalyLookup', () => {
    it('should create empty lookup when no anomaly series exist', () => {
      const rawSeries: RawSeriesEntry[] = [
        {
          name: 'metric1',
          data: [
            ['2025-01-01', 100],
            ['2025-01-02', 200],
          ],
        },
      ];
      const seriesNameLookup = { metric1: 'metric1' };

      const lookup = createAnomalyLookup(rawSeries, seriesNameLookup);
      expect(lookup).toEqual({});
    });

    it('should create lookup for series with anomalies', () => {
      const rawSeries: RawSeriesEntry[] = [
        {
          name: 'metric1',
          data: [
            ['2025-01-01', 100],
            ['2025-01-02', 200],
          ],
        },
        {
          name: 'metric1_is_anomaly',
          data: [
            ['2025-01-01', 0],
            ['2025-01-02', 1],
          ],
        },
        {
          name: 'metric1_anomaly_score',
          data: [
            ['2025-01-01', 0],
            ['2025-01-02', 0.8],
          ],
        },
        {
          name: 'metric2',
          data: [
            ['2025-01-01', 50],
            ['2025-01-02', 50],
          ],
        },
        {
          name: 'metric2_is_anomaly',
          data: [
            // no anomalies detected
            ['2025-01-01', 0],
            ['2025-01-02', 0],
          ],
        },
        {
          name: 'metric2_anomaly_score',
          data: [
            ['2025-01-01', 0],
            ['2025-01-02', 0],
          ],
        },
      ];
      const seriesNameLookup = {
        metric1: 'metric1',
        metric1_is_anomaly: 'metric1_is_anomaly',
        metric1_anomaly_score: 'metric1_anomaly_score',
      };

      const lookup = createAnomalyLookup(rawSeries, seriesNameLookup);
      expect(lookup.metric1.size).toBe(1);
      expect(lookup.metric1.get('2025-01-02')).toEqual({ y: 200, score: 0.8 });
      expect(lookup.metric2.size).toBe(0);
    });

    it('should use default anomaly score when score series is missing', () => {
      const rawSeries: RawSeriesEntry[] = [
        {
          name: 'metric1',
          data: [
            ['2025-01-01', 100],
            ['2025-01-02', 200],
          ],
        },
        {
          name: 'metric1_is_anomaly',
          data: [
            ['2025-01-01', 0],
            ['2025-01-02', 1],
          ],
        },
      ];
      const seriesNameLookup = {
        metric1: 'metric1',
        metric1_is_anomaly: 'metric1_is_anomaly',
      };
      const lookup = createAnomalyLookup(rawSeries, seriesNameLookup);
      expect(lookup.metric1.size).toBe(1);
      expect(lookup.metric1.get('2025-01-02')).toEqual({
        y: 200,
        score: DEFAULT_ANOMALY_SCORE,
      });
    });
  });

  describe('createAnomalyScatterSeries', () => {
    const anomalyLookup: AnomalyLookup = {
      metric1: new Map([
        ['2025-01-01', { y: 100, score: 0.8 }],
        ['2025-01-03', { y: 50, score: 0.5 }],
        ['2025-01-10', { y: 35, score: 0.1 }],
      ]),
      metric2: new Map(),
    };

    it('should create scatter series with correct data', () => {
      const series = createAnomalyScatterSeries(
        'metric1',
        anomalyLookup,
        mockTooltipFormatter,
        mockRefs,
        false,
        mockTheme,
      );

      expect(series.type).toBe('scatter');
      expect(series.symbol).toBe(ANOMALY_POINT_CONFIG.symbol);
      expect(series.zlevel).toBe(ANOMALY_POINT_CONFIG.zLevel);
      expect(series.data).toHaveLength(3);

      const dataPoint1 = series.data![0] as any;
      expect(dataPoint1.value).toEqual(['2025-01-01', 100]);
      expect(dataPoint1.anomalyScore).toBe(0.8);
      expect(dataPoint1.itemStyle.color).toBe(mockTheme.colors.error.base);
      expect(dataPoint1.symbolSize).toBe(6 + 0.8 * 4);

      const dataPoint2 = series.data![1] as any;
      expect(dataPoint2.value).toEqual(['2025-01-03', 50]);
      expect(dataPoint2.anomalyScore).toBe(0.5);
      expect(dataPoint2.itemStyle.color).toBe(mockTheme.colors.warning.base);
      expect(dataPoint2.symbolSize).toBe(6 + 0.5 * 4);

      const dataPoint3 = series.data![2] as any;
      expect(dataPoint3.value).toEqual(['2025-01-10', 35]);
      expect(dataPoint3.anomalyScore).toBe(0.1);
      expect(dataPoint3.itemStyle.color).toBe(mockTheme.colors.info.base);
      expect(dataPoint3.symbolSize).toBe(6 + 0.1 * 4);
    });

    it('should handle empty map in anomaly lookup', () => {
      const series = createAnomalyScatterSeries(
        'metric2',
        anomalyLookup,
        mockTooltipFormatter,
        mockRefs,
        false,
        mockTheme,
      );

      expect(series.data).toEqual([]);
    });

    it('should handle empty anomaly lookup', () => {
      const series = createAnomalyScatterSeries(
        'metric1',
        {},
        mockTooltipFormatter,
        mockRefs,
        false,
        mockTheme,
      );

      expect(series.data).toEqual([]);
    });
  });

  describe('processAnomaliesForChart', () => {
    const rawSeries: RawSeriesEntry[] = [
      {
        name: 'metric1',
        data: [
          ['2025-01-01', 100],
          ['2025-01-02', 200],
        ],
      },
      {
        name: 'metric1_is_anomaly',
        data: [
          ['2025-01-01', 1],
          ['2025-01-02', 1],
        ],
      },
      {
        name: 'metric1_anomaly_score',
        data: [
          ['2025-01-01', 0.8],
          ['2025-01-02', 0.2],
        ],
      },
      { name: 'metric2', data: [['2025-01-01', 300]] },
      { name: 'metric2_is_anomaly', data: [['2025-01-01', 1]] }, // missing anomaly score series
      { name: 'metric3', data: [['2025-01-01', 60]] },
      { name: 'metric3_is_anomaly', data: [['2025-01-01', 0]] }, // no anomalies
      { name: 'metric3_anomaly_score', data: [['2025-01-01', 0]] },
      { name: 'metric4', data: [] }, // empty data series
      { name: 'metric5', data: [['2025-01-01', 500]] }, // no associated anomaly series
    ];
    it('should correctly process multiple series with anomalies', () => {
      const scatterSeries = processAnomaliesForChart(
        rawSeries,
        {},
        createAnomalyLookup(rawSeries, {}),
        mockTooltipFormatter,
        mockRefs,
        false,
        mockTheme,
      );

      expect(scatterSeries).toHaveLength(2);
      expect(scatterSeries[0].name).toBe('metric1 - Anomalies');
      expect(scatterSeries[1].name).toBe('metric2 - Anomalies');
    });
  });
});
