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
import { anomalyDetectionOperator } from '../../src/operators/anomalyDetectionOperator';

jest.mock('@superset-ui/core', () => ({
  ...jest.requireActual('@superset-ui/core'),
  getXAxisLabel: jest.fn(),
}));

const { getXAxisLabel } = jest.requireMock('@superset-ui/core') as {
  getXAxisLabel: jest.Mock;
};

test('returns isolation forest anomaly_detection rule when enabled and x-axis exists', () => {
  getXAxisLabel.mockReturnValue(['__timestamp']);

  const formData = {
    anomalyDetectionEnabled: true,
    anomalyDetectionContaminationRate: '0.1',
    anomalyDetectionDetrend: true,
    anomalyDetectionYearlySeasonality: true,
    anomalyDetectionMonthlySeasonality: false,
    anomalyDetectionWeeklySeasonality: true,
  };

  // operator ignores queryObject.
  // Default Isolation Forest omits the `algorithm` key so the payload stays
  // backward compatible with backends that predate algorithm selection.
  // @ts-ignore
  expect(anomalyDetectionOperator(formData, {})).toEqual({
    operation: 'anomaly_detection',
    options: {
      contamination_rate: 0.1,
      detrend: true,
      yearly_seasonality: true,
      monthly_seasonality: false,
      weekly_seasonality: true,
      index: ['__timestamp'],
    },
  });
});

test('omits algorithm from the default isolation forest payload', () => {
  getXAxisLabel.mockReturnValue(['__timestamp']);

  const formData = {
    anomalyDetectionEnabled: true,
    anomalyDetectionContaminationRate: '0.05',
  };

  // @ts-ignore
  const rule = anomalyDetectionOperator(formData, {});
  // @ts-ignore
  expect(rule.options).not.toHaveProperty('algorithm');
});

test('returns z-score rule with threshold and sliding window when selected', () => {
  getXAxisLabel.mockReturnValue(['__timestamp']);

  const formData = {
    anomalyDetectionEnabled: true,
    anomalyDetectionAlgorithm: 'z_score',
    anomalyDetectionZScoreThreshold: '4',
    anomalyDetectionSlidingWindow: '7',
  };

  // @ts-ignore
  expect(anomalyDetectionOperator(formData, {})).toEqual({
    operation: 'anomaly_detection',
    options: {
      algorithm: 'z_score',
      z_score_threshold: 4,
      sliding_window: 7,
      index: ['__timestamp'],
    },
  });
});

test('omits sliding window for z-score when left blank', () => {
  getXAxisLabel.mockReturnValue(['__timestamp']);

  const formData = {
    anomalyDetectionEnabled: true,
    anomalyDetectionAlgorithm: 'z_score',
    anomalyDetectionZScoreThreshold: '3',
    anomalyDetectionSlidingWindow: '',
  };

  // @ts-ignore
  expect(anomalyDetectionOperator(formData, {})).toEqual({
    operation: 'anomaly_detection',
    options: {
      algorithm: 'z_score',
      z_score_threshold: 3,
      index: ['__timestamp'],
    },
  });
});

test('returns undefined when disabled', () => {
  getXAxisLabel.mockReturnValue(['__timestamp']);

  const formData = {
    anomalyDetectionEnabled: false,
    anomalyDetectionContaminationRate: '0.1',
  };

  // @ts-ignore
  expect(anomalyDetectionOperator(formData, {})).toBeUndefined();
});

test('returns undefined when enabled but x-axis label is missing', () => {
  getXAxisLabel.mockReturnValue(undefined);

  const formData = {
    anomalyDetectionEnabled: true,
    anomalyDetectionContaminationRate: '0.1',
  };

  // @ts-ignore
  expect(anomalyDetectionOperator(formData, {})).toBeUndefined();
});
