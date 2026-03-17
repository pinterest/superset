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

// timezone for unit tests
process.env.TZ = 'America/New_York';

module.exports = {
  testRegex:
    '\\/superset-frontend\\/(spec|src|plugins|packages|tools|pinterest-plugins)\\/.*(_spec|\\.test)\\.[jt]sx?$',
  moduleNameMapper: {
    '\\.(css|less|geojson)$': '<rootDir>/spec/__mocks__/mockExportObject.js',
    '\\.(gif|ttf|eot|png|jpg)$': '<rootDir>/spec/__mocks__/mockExportString.js',
    '\\.svg$': '<rootDir>/spec/__mocks__/svgrMock.tsx',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^spec/(.*)$': '<rootDir>/spec/$1',
    // mapping plugins of superset-ui to source code
    '@superset-ui/(.*)$': '<rootDir>/node_modules/@superset-ui/$1/src',
    // mapping pinterest-plugins modules to stub files for Jest
    '^@pinterest-plugins/src/views/routes$':
      '<rootDir>/pinterest-plugins/src/views/routes.stub.tsx',
    '^@pinterest-plugins/src/utils$':
      '<rootDir>/pinterest-plugins/src/utils.stub.ts',
    '^@pinterest-plugins/src/visualizations$':
      '<rootDir>/pinterest-plugins/src/visualizations.stub.ts',
    '^@pinterest-plugins/src/chart-controls/controlMap$':
      '<rootDir>/pinterest-plugins/src/chart-controls/controlMap.stub.ts',
    '^@pinterest-plugins/src/explore/components/pinterestChartPills$':
      '<rootDir>/pinterest-plugins/src/explore/components/pinterestChartPills.stub.tsx',
    '^@pinterest-plugins/src/governance/pinterestTieringInfoModal$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestTieringInfoModal.stub.tsx',
    '^@pinterest-plugins/src/governance/pinterestPromoteTier1Modal$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestPromoteTier1Modal.stub.tsx',
    '^@pinterest-plugins/src/governance/pinterestNewDashboardTierModal$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestNewDashboardTierModal.stub.tsx',
    '^@pinterest-plugins/src/governance/pinterestTitlePanelAdditionalItems$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestTitlePanelAdditionalItems.stub.tsx',
    '^@pinterest-plugins/src/governance/pinterestDashboardBanners$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestDashboardBanners.stub.tsx',
    '^@pinterest-plugins/src/explore/components/warden/createWardenAlertModal$':
      '<rootDir>/pinterest-plugins/src/explore/components/warden/createWardenAlertModal.stub.tsx',
    '^@pinterest-plugins/src/features/dashboards/dashboardListExtensions$':
      '<rootDir>/pinterest-plugins/src/features/dashboards/dashboardListExtensions.stub.tsx',
    // general mapping for other @pinterest-plugins modules
    '^@pinterest-plugins/(.*)$': '<rootDir>/pinterest-plugins/$1',
  },
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: ['<rootDir>/packages/generator-superset'],
  setupFilesAfterEnv: ['<rootDir>/spec/helpers/setup.ts'],
  snapshotSerializers: ['@emotion/jest/serializer'],
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '{packages,plugins,pinterest-plugins}/**/src/**/*.{js,jsx,ts,tsx}',
    '!**/*.stories.*',
    '!packages/superset-ui-demo/**/*',
  ],
  coverageDirectory: '<rootDir>/coverage/',
  coveragePathIgnorePatterns: [
    'coverage/',
    'node_modules/',
    'public/',
    'tmp/',
    'dist/',
  ],
  coverageReporters: ['lcov', 'json-summary', 'html', 'text'],
  transformIgnorePatterns: [
    'node_modules/(?!d3-(array|interpolate|color|time)|internmap|remark-gfm|markdown-table|micromark-*.|decode-named-character-reference|character-entities|mdast-util-*.|unist-util-*.|ccount|escape-string-regexp|nanoid|@rjsf/*.|sinon|echarts|zrender|fetch-mock|pretty-ms|parse-ms|ol|@babel/runtime|@emotion|cheerio|cheerio/lib|parse5|dom-serializer|entities|htmlparser2|rehype-sanitize|hast-util-sanitize|unified|unist-.*|hast-.*|rehype-.*|remark-.*|mdast-.*|micromark-.*|parse-entities|property-information|space-separated-tokens|comma-separated-tokens|bail|devlop|zwitch|longest-streak|jest-enzyme)',
  ],
  preset: 'ts-jest',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    __DEV__: true,
    caches: true,
  },
  reporters: [
    'default',
    [
      './node_modules/jest-html-reporter',
      {
        pageTitle: 'Test Report',
      },
    ],
  ],
  testTimeout: 10000,
};
