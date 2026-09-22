/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  AnnotationStyle,
  AnnotationType,
  AnnotationSourceType,
  DataRecord,
  FormulaAnnotationLayer,
  IntervalAnnotationLayer,
  VizType,
  ChartDataResponseResult,
} from '@superset-ui/core';
import {
  LegendOrientation,
  LegendType,
  EchartsTimeseriesSeriesType,
} from '../../src';
import transformProps from '../../src/MixedTimeseries/transformProps';
import {
  EchartsMixedTimeseriesFormData,
  EchartsMixedTimeseriesProps,
} from '../../src/MixedTimeseries/types';
import { DEFAULT_FORM_DATA } from '../../src/MixedTimeseries/types';
import { createEchartsTimeseriesTestChartProps } from '../helpers';
import type { SeriesOption } from 'echarts';

/**
 * Creates a partial ChartDataResponseResult for testing.
 * Only includes the fields needed for tests, with sensible defaults for required fields.
 */
function createTestQueryData(
  data: unknown[],
  overrides?: Partial<ChartDataResponseResult> & {
    label_map?: Record<string, string[]>;
  },
): ChartDataResponseResult {
  return {
    annotation_data: null,
    cache_key: null,
    cache_timeout: null,
    cached_dttm: null,
    queried_dttm: null,
    data: data as DataRecord[],
    colnames: [],
    coltypes: [],
    error: null,
    is_cached: false,
    query: '',
    rowcount: data.length,
    sql_rowcount: data.length,
    stacktrace: null,
    status: 'success',
    from_dttm: null,
    to_dttm: null,
    label_map: {},
    ...overrides,
  } as ChartDataResponseResult & { label_map?: Record<string, string[]> };
}

/** Defaults for createEchartsTimeseriesTestChartProps in Mixed Timeseries tests. */
const MIXED_TIMESERIES_CHART_PROPS_DEFAULTS = {
  defaultFormData: DEFAULT_FORM_DATA,
  defaultVizType: 'mixed_timeseries' as const,
};

const formData: EchartsMixedTimeseriesFormData = {
  annotationLayers: [],
  area: false,
  areaB: false,
  legendMargin: null,
  logAxis: false,
  logAxisSecondary: false,
  markerEnabled: false,
  markerEnabledB: false,
  markerSize: 0,
  markerSizeB: 0,
  minorSplitLine: false,
  minorTicks: false,
  opacity: 0,
  opacityB: 0,
  orderDesc: false,
  orderDescB: false,
  richTooltip: false,
  rowLimit: 0,
  rowLimitB: 0,
  legendOrientation: LegendOrientation.Top,
  legendType: LegendType.Scroll,
  showLegend: false,
  showValue: false,
  showValueB: false,
  stack: true,
  stackB: true,
  truncateYAxis: false,
  truncateYAxisSecondary: false,
  xAxisLabelRotation: 0,
  xAxisTitle: '',
  xAxisTitleMargin: 0,
  yAxisBounds: [undefined, undefined],
  yAxisBoundsSecondary: [undefined, undefined],
  yAxisTitle: '',
  yAxisTitleMargin: 15,
  yAxisTitlePosition: '',
  yAxisTitleSecondary: '',
  zoomable: false,
  colorScheme: 'bnbColors',
  datasource: '3__table',
  x_axis: 'ds',
  metrics: ['sum__num'],
  metricsB: ['sum__num'],
  groupby: ['gender'],
  groupbyB: ['gender'],
  seriesType: EchartsTimeseriesSeriesType.Line,
  seriesTypeB: EchartsTimeseriesSeriesType.Bar,
  viz_type: VizType.MixedTimeseries,
  forecastEnabled: false,
  forecastPeriods: [],
  forecastInterval: 0,
  forecastSeasonalityDaily: 0,
  legendSort: null,
  pinterestDeltaTable: false,
  pinterestDeltaTableColumns: [],
};

const defaultQueryRows = [
  { boy: 1, girl: 2, ds: 599616000000 },
  { boy: 3, girl: 4, ds: 599916000000 },
];
const defaultLabelMap = { ds: ['ds'], boy: ['boy'], girl: ['girl'] };

const queriesData: ChartDataResponseResult[] = [
  createTestQueryData(defaultQueryRows, { label_map: defaultLabelMap }),
  createTestQueryData(defaultQueryRows, { label_map: defaultLabelMap }),
];

test('should transform chart props for viz with showQueryIdentifiers=false', () => {
  const chartProps = createEchartsTimeseriesTestChartProps<
    EchartsMixedTimeseriesFormData,
    EchartsMixedTimeseriesProps
  >({
    ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
    defaultQueriesData: queriesData,
    formData: { ...formData, showQueryIdentifiers: false },
    queriesData,
  });
  const transformed = transformProps(chartProps);

  // Check that series IDs don't include query identifiers
  const seriesIds = (transformed.echartOptions.series as any[]).map(
    (s: any) => s.id,
  );
  expect(seriesIds).toContain('sum__num, girl');
  expect(seriesIds).toContain('sum__num, boy');
  expect(seriesIds).not.toContain('sum__num (Query A), girl');
  expect(seriesIds).not.toContain('sum__num (Query A), boy');
  expect(seriesIds).not.toContain('sum__num (Query B), girl');
  expect(seriesIds).not.toContain('sum__num (Query B), boy');

  // Check that series name include query identifiers
  const seriesName = (transformed.echartOptions.series as any[]).map(
    (s: any) => s.name,
  );
  expect(seriesName).toContain('sum__num, girl');
  expect(seriesName).toContain('sum__num, boy');
  expect(seriesName).not.toContain('sum__num (Query A), girl');
  expect(seriesName).not.toContain('sum__num (Query A), boy');
  expect(seriesName).not.toContain('sum__num (Query B), girl');
  expect(seriesName).not.toContain('sum__num (Query B), boy');

  expect((transformed.echartOptions.legend as any).data).toEqual([
    'sum__num, girl',
    'sum__num, boy',
    'sum__num, girl',
    'sum__num, boy',
  ]);
});

test('should transform chart props for viz with showQueryIdentifiers=true', () => {
  const chartProps = createEchartsTimeseriesTestChartProps<
    EchartsMixedTimeseriesFormData,
    EchartsMixedTimeseriesProps
  >({
    ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
    defaultQueriesData: queriesData,
    formData: { ...formData, showQueryIdentifiers: true },
    queriesData,
  });
  const transformed = transformProps(chartProps);

  // Check that series IDs include query identifiers
  const seriesIds = (transformed.echartOptions.series as any[]).map(
    (s: any) => s.id,
  );
  expect(seriesIds).toContain('sum__num (Query A), girl');
  expect(seriesIds).toContain('sum__num (Query A), boy');
  expect(seriesIds).toContain('sum__num (Query B), girl');
  expect(seriesIds).toContain('sum__num (Query B), boy');
  expect(seriesIds).not.toContain('sum__num, girl');
  expect(seriesIds).not.toContain('sum__num, boy');

  // Check that series name include query identifiers
  const seriesName = (transformed.echartOptions.series as any[]).map(
    (s: any) => s.name,
  );
  expect(seriesName).toContain('sum__num (Query A), girl');
  expect(seriesName).toContain('sum__num (Query A), boy');
  expect(seriesName).toContain('sum__num (Query B), girl');
  expect(seriesName).toContain('sum__num (Query B), boy');
  expect(seriesName).not.toContain('sum__num, girl');
  expect(seriesName).not.toContain('sum__num, boy');

  expect((transformed.echartOptions.legend as any).data).toEqual([
    'sum__num (Query A), girl',
    'sum__num (Query A), boy',
    'sum__num (Query B), girl',
    'sum__num (Query B), boy',
  ]);
});

describe('legend sorting', () => {
  const getChartProps = (overrides = {}) =>
    createEchartsTimeseriesTestChartProps<
      EchartsMixedTimeseriesFormData,
      EchartsMixedTimeseriesProps
    >({
      ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
      defaultQueriesData: queriesData,
      formData: {
        ...formData,
        ...overrides,
        showQueryIdentifiers: true,
      },
      queriesData,
    });

  test('sort legend by data', () => {
    const chartProps = getChartProps({
      legendSort: null,
    });
    const transformed = transformProps(chartProps);

    expect((transformed.echartOptions.legend as any).data).toEqual([
      'sum__num (Query A), girl',
      'sum__num (Query A), boy',
      'sum__num (Query B), girl',
      'sum__num (Query B), boy',
    ]);
  });

  test('sort legend by label ascending', () => {
    const chartProps = getChartProps({
      legendSort: 'asc',
    });
    const transformed = transformProps(chartProps);

    expect((transformed.echartOptions.legend as any).data).toEqual([
      'sum__num (Query A), boy',
      'sum__num (Query A), girl',
      'sum__num (Query B), boy',
      'sum__num (Query B), girl',
    ]);
  });

  test('sort legend by label descending', () => {
    const chartProps = getChartProps({
      legendSort: 'desc',
    });
    const transformed = transformProps(chartProps);

    expect((transformed.echartOptions.legend as any).data).toEqual([
      'sum__num (Query B), girl',
      'sum__num (Query B), boy',
      'sum__num (Query A), girl',
      'sum__num (Query A), boy',
    ]);
  });
});

test('legend margin: top orientation sets grid.top correctly', () => {
  const chartProps = createEchartsTimeseriesTestChartProps<
    EchartsMixedTimeseriesFormData,
    EchartsMixedTimeseriesProps
  >({
    ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
    defaultQueriesData: queriesData,
    formData: {
      ...formData,
      legendMargin: 250,
      showLegend: true,
    },
    queriesData,
  });
  const transformed = transformProps(chartProps);

  expect((transformed.echartOptions.grid as any).top).toEqual(270);
});

test('legend margin: bottom orientation sets grid.bottom correctly', () => {
  const chartProps = createEchartsTimeseriesTestChartProps<
    EchartsMixedTimeseriesFormData,
    EchartsMixedTimeseriesProps
  >({
    ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
    defaultQueriesData: queriesData,
    formData: {
      ...formData,
      legendMargin: 250,
      showLegend: true,
      legendOrientation: LegendOrientation.Bottom,
    },
    queriesData,
  });
  const transformed = transformProps(chartProps);

  expect((transformed.echartOptions.grid as any).bottom).toEqual(270);
});

test('legend margin: left orientation sets grid.left correctly', () => {
  const chartProps = createEchartsTimeseriesTestChartProps<
    EchartsMixedTimeseriesFormData,
    EchartsMixedTimeseriesProps
  >({
    ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
    defaultQueriesData: queriesData,
    formData: {
      ...formData,
      legendMargin: 250,
      showLegend: true,
      legendOrientation: LegendOrientation.Left,
    },
    queriesData,
  });
  const transformed = transformProps(chartProps);

  expect((transformed.echartOptions.grid as any).left).toEqual(270);
});

test('legend margin: right orientation sets grid.right correctly', () => {
  const chartProps = createEchartsTimeseriesTestChartProps<
    EchartsMixedTimeseriesFormData,
    EchartsMixedTimeseriesProps
  >({
    ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
    defaultQueriesData: queriesData,
    formData: {
      ...formData,
      legendMargin: 270,
      showLegend: true,
      legendOrientation: LegendOrientation.Right,
    },
    queriesData,
  });
  const transformed = transformProps(chartProps);

  expect((transformed.echartOptions.grid as any).right).toEqual(270);
});

test('should exclude unnamed annotation helper series from legend data', () => {
  const interval: IntervalAnnotationLayer = {
    annotationType: AnnotationType.Interval,
    name: 'My Interval',
    show: true,
    showLabel: true,
    sourceType: AnnotationSourceType.Table,
    titleColumn: '',
    timeColumn: 'start',
    intervalEndColumn: 'end',
    descriptionColumns: [],
    style: AnnotationStyle.Dashed,
    value: 2,
  };

  const annotationData = {
    'My Interval': {
      columns: ['start', 'end', 'title'],
      records: [
        {
          start: 2000,
          end: 3000,
          title: 'My Title',
        },
      ],
    },
  };

  const chartProps = createEchartsTimeseriesTestChartProps<
    EchartsMixedTimeseriesFormData,
    EchartsMixedTimeseriesProps
  >({
    ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
    defaultQueriesData: [],
    formData: {
      ...formData,
      annotationLayers: [interval],
      showLegend: true,
      showQueryIdentifiers: true,
    },
    queriesData: [
      createTestQueryData(defaultQueryRows, {
        label_map: defaultLabelMap,
        annotation_data: annotationData,
      }),
      createTestQueryData(defaultQueryRows, {
        label_map: defaultLabelMap,
        annotation_data: annotationData,
      }),
    ],
  });
  const transformed = transformProps(chartProps);

  expect((transformed.echartOptions.legend as any).data).toEqual([
    'sum__num (Query A), girl',
    'sum__num (Query A), boy',
    'sum__num (Query B), girl',
    'sum__num (Query B), boy',
  ]);
});

test('should add a formula annotation when X-axis column has dataset-level label', () => {
  const formula: FormulaAnnotationLayer = {
    name: 'My Formula',
    annotationType: AnnotationType.Formula,
    value: 'x*2',
    style: AnnotationStyle.Solid,
    show: true,
    showLabel: true,
  };
  const timeColumnName = 'ds';
  const timeColumnLabel = 'Time Label';
  const testData = [
    {
      [timeColumnLabel]: 599616000000,
      boy: 1,
      girl: 2,
    },
    {
      [timeColumnLabel]: 599916000000,
      boy: 3,
      girl: 4,
    },
  ];
  const chartProps = createEchartsTimeseriesTestChartProps<
    EchartsMixedTimeseriesFormData,
    EchartsMixedTimeseriesProps
  >({
    ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
    defaultQueriesData: [],
    formData: {
      ...formData,
      x_axis: timeColumnName,
      annotationLayers: [formula],
    },
    queriesData: [
      createTestQueryData(testData, {
        label_map: {
          [timeColumnName]: [timeColumnLabel],
          boy: ['boy'],
          girl: ['girl'],
        },
      }),
      createTestQueryData(testData, {
        label_map: {
          [timeColumnName]: [timeColumnLabel],
          boy: ['boy'],
          girl: ['girl'],
        },
      }),
    ],
    datasource: {
      verboseMap: {
        [timeColumnName]: timeColumnLabel,
      },
      columnFormats: {},
      currencyFormats: {},
    },
  });
  const result = transformProps(chartProps);
  const formulaSeries = (
    result.echartOptions.series as SeriesOption[] | undefined
  )?.find((s: SeriesOption) => s.name === 'My Formula');
  expect(formulaSeries).toBeDefined();
  expect(formulaSeries?.data).toBeDefined();
  expect(Array.isArray(formulaSeries?.data)).toBe(true);
  expect((formulaSeries!.data as unknown[]).length).toBeGreaterThan(0);
});

test('regression #37921: multi-metric Query A with groupby does not duplicate first metric in series names', () => {
  // Regression test for https://github.com/apache/superset/issues/37921
  // ("Residual" follow-up to #37055).
  //
  // When Query A has multiple metrics + at least one Group By dimension,
  // the display-name builder in transformProps.ts used to prepend the FIRST
  // metric's display name to every series that didn't literally contain it:
  //   name: `${MetricDisplayNameA}, ${entryName}`
  // For series belonging to the *second* metric, this produced a
  // cross-contaminated label like `score_one, score_two, A` — the
  // user-visible "first metric duplicated" symptom in the legend / tooltip.
  // The fix derives each series' metric from its label-map tuple instead.
  const multiMetricRows = [
    {
      'score_one, A': 1,
      'score_one, B': 2,
      'score_two, A': 3,
      'score_two, B': 4,
      ds: 599616000000,
    },
    {
      'score_one, A': 5,
      'score_one, B': 6,
      'score_two, A': 7,
      'score_two, B': 8,
      ds: 599916000000,
    },
  ];
  const multiMetricLabelMap = {
    ds: ['ds'],
    'score_one, A': ['score_one', 'A'],
    'score_one, B': ['score_one', 'B'],
    'score_two, A': ['score_two', 'A'],
    'score_two, B': ['score_two', 'B'],
  };

  const queryAData = createTestQueryData(multiMetricRows, {
    label_map: multiMetricLabelMap,
  });
  // Query B keeps the existing single-metric shape — the bug is on
  // Query A's path so we just need a valid Query B alongside.
  const queryBData = createTestQueryData(defaultQueryRows, {
    label_map: defaultLabelMap,
  });

  const chartProps = createEchartsTimeseriesTestChartProps<
    EchartsMixedTimeseriesFormData,
    EchartsMixedTimeseriesProps
  >({
    ...MIXED_TIMESERIES_CHART_PROPS_DEFAULTS,
    defaultQueriesData: [queryAData, queryBData],
    formData: {
      ...formData,
      metrics: ['score_one', 'score_two'],
      groupby: ['category'],
    },
    queriesData: [queryAData, queryBData],
  });
  const transformed = transformProps(chartProps);

  const queryASeriesNames = (transformed.echartOptions.series as any[])
    .map((s: any) => String(s.name))
    .filter((n: string) => n.includes('score_'));

  // Each (metric, dim_value) combo from Query A should appear exactly once
  // with the *correct* metric prefix — not the first-metric-prepended-to-
  // everything-else form. Comparing the sorted array (rather than using
  // separate toContain assertions) also catches a regression that emits
  // duplicate series for the same name.
  expect([...queryASeriesNames].sort()).toEqual(
    ['score_one, A', 'score_one, B', 'score_two, A', 'score_two, B'].sort(),
  );

  // And explicitly: no series name should contain *both* metric names —
  // that's the smoking gun for the duplication bug.
  for (const name of queryASeriesNames) {
    expect(name).not.toMatch(/score_one,\s+score_two/);
  }
});
