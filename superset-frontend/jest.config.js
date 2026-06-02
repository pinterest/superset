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
    '^@superset-ui/([^/]+)/(.*)$':
      '<rootDir>/node_modules/@superset-ui/$1/src/$2',
    '^@superset-ui/([^/]+)$': '<rootDir>/node_modules/@superset-ui/$1/src',
    // mapping @apache-superset/core to local package
    '^@apache-superset/core$': '<rootDir>/packages/superset-core/src',
    '^@apache-superset/core/(.*)$': '<rootDir>/packages/superset-core/src/$1',
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
    '^@pinterest-plugins/src/governance/pinterestDashboardSecondRowTags$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestDashboardSecondRowTags.stub.tsx',
    '^@pinterest-plugins/src/governance/pinterestDashboardBanners$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestDashboardBanners.stub.tsx',
    '^@pinterest-plugins/src/explore/components/warden/createWardenAlertModal$':
      '<rootDir>/pinterest-plugins/src/explore/components/warden/createWardenAlertModal.stub.tsx',
    '^@pinterest-plugins/src/features/dashboards/dashboardListExtensions$':
      '<rootDir>/pinterest-plugins/src/features/dashboards/dashboardListExtensions.stub.tsx',
    '^@pinterest-plugins/src/features/charts/chartListExtensions$':
      '<rootDir>/pinterest-plugins/src/features/charts/chartListExtensions.stub.tsx',
    '^@pinterest-plugins/src/sqllab/pinterestSqlLabToolbarExtras$':
      '<rootDir>/pinterest-plugins/src/sqllab/pinterestSqlLabToolbarExtras.stub.tsx',
    '^@pinterest-plugins/src/dashboard/pinterestChartHeaderExtras$':
      '<rootDir>/pinterest-plugins/src/dashboard/pinterestChartHeaderExtras.stub.tsx',
    '^@pinterest-plugins/src/dashboard/pinterestDashboardHeaderExtras$':
      '<rootDir>/pinterest-plugins/src/dashboard/pinterestDashboardHeaderExtras.stub.tsx',
    '^@pinterest-plugins/src/features/listView/pinterestListViewExtras$':
      '<rootDir>/pinterest-plugins/src/features/listView/pinterestListViewExtras.stub.tsx',
    '^@pinterest-plugins/src/governance/pinterestPushToDataHubModal$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestPushToDataHubModal.stub.tsx',
    '^@pinterest-plugins/src/explore/pinterestExploreViewContainer$':
      '<rootDir>/pinterest-plugins/src/explore/pinterestExploreViewContainer.stub.tsx',
    '^@pinterest-plugins/src/dashboard/pinterestDashboardPage$':
      '<rootDir>/pinterest-plugins/src/dashboard/pinterestDashboardPage.stub.tsx',
    '^@pinterest-plugins/src/features/dashboards/pinterestDashboardCard$':
      '<rootDir>/pinterest-plugins/src/features/dashboards/pinterestDashboardCard.stub.tsx',
    '^@pinterest-plugins/src/features/charts/pinterestChartCard$':
      '<rootDir>/pinterest-plugins/src/features/charts/pinterestChartCard.stub.tsx',
    '^@pinterest-plugins/src/governance/softDeletion/pinterestSoftDeletedCell$':
      '<rootDir>/pinterest-plugins/src/governance/softDeletion/pinterestSoftDeletedCell.stub.tsx',
    '^@pinterest-plugins/src/governance/softDeletion/pinterestSoftDeletedCardOverlay$':
      '<rootDir>/pinterest-plugins/src/governance/softDeletion/pinterestSoftDeletedCardOverlay.stub.tsx',
    '^@pinterest-plugins/src/governance/softDeletion/softDeletionSliceFilter$':
      '<rootDir>/pinterest-plugins/src/governance/softDeletion/softDeletionSliceFilter.stub.ts',
    '^@pinterest-plugins/src/components/Chart/pinterestChartContainer$':
      '<rootDir>/pinterest-plugins/src/components/Chart/pinterestChartContainer.stub.tsx',
    '^@pinterest-plugins/src/governance/pinterestVerifyChartModal$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestVerifyChartModal.stub.tsx',
    '^@pinterest-plugins/src/governance/chartGovernancePermissions$':
      '<rootDir>/pinterest-plugins/src/governance/chartGovernancePermissions.stub.ts',
    '^@pinterest-plugins/src/governance/pinterestChartTitlePanelAdditionalItems$':
      '<rootDir>/pinterest-plugins/src/governance/pinterestChartTitlePanelAdditionalItems.stub.tsx',
    // general mapping for other @pinterest-plugins modules
    '^@pinterest-plugins/(.*)$': '<rootDir>/pinterest-plugins/$1',
  },
  testEnvironment: '<rootDir>/spec/helpers/jsDomWithFetchAPI.ts',
  modulePathIgnorePatterns: [
    '<rootDir>/packages/generator-superset',
    '<rootDir>/packages/.*/esm',
    '<rootDir>/packages/.*/lib',
    '<rootDir>/plugins/.*/esm',
    '<rootDir>/plugins/.*/lib',
    // Ignore build artifacts that contain duplicate package.json or mock files
    '<rootDir>/storybook-static',
    // Ignore duplicate __mocks__ at package root level (e.g., packages/superset-ui-core/__mocks__)
    // but not test __mocks__ directories (e.g., packages/superset-ui-core/test/__mocks/)
    '<rootDir>/packages/[^/]+/__mocks__',
  ],
  setupFilesAfterEnv: ['<rootDir>/spec/helpers/setup.ts'],
  snapshotSerializers: ['@emotion/jest/serializer'],
  testEnvironmentOptions: {
    globalsCleanup: true,
    url: 'http://localhost',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '{packages,plugins,pinterest-plugins}/**/src/**/*.{js,jsx,ts,tsx}',
    '!**/*.stories.*',
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
    'node_modules/(?!d3-(array|interpolate|color|time|scale|time-format|format)|internmap|@mapbox/tiny-sdf|remark-gfm|(?!@ngrx|(?!deck.gl)|d3-scale)|markdown-table|micromark-*.|decode-named-character-reference|character-entities|mdast-util-*.|unist-util-*.|ccount|escape-string-regexp|nanoid|uuid|@rjsf/*.|echarts|zrender|fetch-mock|pretty-ms|parse-ms|ol|@babel/runtime|@emotion|cheerio|cheerio/lib|parse5|dom-serializer|entities|htmlparser2|rehype-sanitize|hast-util-sanitize|unified|unist-.*|hast-.*|rehype-.*|remark-.*|mdast-.*|micromark-.*|parse-entities|property-information|space-separated-tokens|comma-separated-tokens|bail|devlop|zwitch|longest-streak|geostyler|geostyler-.*|react-error-boundary|react-json-tree|react-base16-styling|lodash-es|rbush|quickselect)',
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
  testTimeout: 20000,
};
