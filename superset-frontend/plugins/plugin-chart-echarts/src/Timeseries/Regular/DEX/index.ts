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
import { AnnotationType, Behavior, t } from '@superset-ui/core';
import {
  EchartsTimeseriesChartProps,
  EchartsTimeseriesFormData,
  EchartsTimeseriesSeriesType,
} from '../../types';

import { EchartsChartPlugin } from '../../../types';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

const dexTransformProps = (chartProps: EchartsTimeseriesChartProps) =>
  transformProps({
    ...chartProps,
    formData: {
      ...chartProps.formData,
      seriesType: EchartsTimeseriesSeriesType.Line,
    },
  });

export default class DEXChartPlugin extends EchartsChartPlugin<
  EchartsTimeseriesFormData,
  EchartsTimeseriesChartProps
> {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('./DEXChart'),
      metadata: {
        behaviors: [
          Behavior.InteractiveChart,
          Behavior.DrillToDetail,
          Behavior.DrillBy,
        ],
        category: t('Evolution'),
        credits: ['https://echarts.apache.org'],
        description: t('DEX chart is used for DEX UI'),
        exampleGallery: [],
        supportedAnnotationTypes: [
          AnnotationType.Event,
          AnnotationType.Formula,
          AnnotationType.Interval,
          AnnotationType.Timeseries,
        ],
        name: t('DEX Chart'),
        tags: [t('ECharts'), t('Advanced-Analytics'), t('Line'), t('Featured')],
      },
      transformProps: dexTransformProps,
    });
  }
}
