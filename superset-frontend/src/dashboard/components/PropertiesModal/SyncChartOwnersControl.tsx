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
import Checkbox from 'src/components/Checkbox';
import { t } from '@superset-ui/core';
import { useMemo } from 'react';
import WarningIconWithTooltip from 'src/components/WarningIconWithTooltip';
import { ChartInfo } from 'src/dashboard/components/PropertiesModal';

export type SyncChartOwnersControlProps = {
  autoSyncChartsEnabled: boolean;
  onChange: (value: boolean) => void;
  dashboardOwnerIds: number[];
  chartInfoMap: Record<number, ChartInfo>;
};

const SyncChartOwnersControl = ({
  autoSyncChartsEnabled,
  onChange,
  dashboardOwnerIds,
  chartInfoMap,
}: SyncChartOwnersControlProps) => {
  const dashboardOwnerIdsSet = useMemo(
    () => new Set(dashboardOwnerIds),
    [dashboardOwnerIds],
  );

  const tooltipText = useMemo(() => {
    const unsupportedChartNames = Object.values(chartInfoMap)
      .filter(chartInfo => {
        const chartOwnerSet = new Set(chartInfo.ownerIds);
        for (const id of chartOwnerSet) {
          if (dashboardOwnerIdsSet.has(id)) {
            return false;
          }
        }
        return true;
      })
      .map(chartInfo => chartInfo.name)
      .sort((a, b) => a.localeCompare(b));

    if (unsupportedChartNames.length === 0) {
      return '';
    }

    let chartsToShow = unsupportedChartNames;

    if (unsupportedChartNames.length > 3) {
      chartsToShow = chartsToShow.slice(0, 3);
      const remainingCount = unsupportedChartNames.length - 3;
      chartsToShow.push(
        `and ${remainingCount === 1 ? '1 other' : `${remainingCount} others`}`,
      );
    }

    return `You do not have permission to update the following charts: ${chartsToShow.join(
      ', ',
    )}`;
  }, [chartInfoMap, dashboardOwnerIdsSet]);

  const showTooltip = autoSyncChartsEnabled && tooltipText.length > 0;

  return (
    <div data-test="sync-chart-owners-control" style={{ marginBottom: '8px'}}>
      <Checkbox
        aria-checked={autoSyncChartsEnabled}
        // aria-labelledby is not being forwarded to the checkbox component.
        // data-test selector isn't being rendered by the checkbox span.
        // Wrap this in a div to find this checkbox in tests.
        checked={autoSyncChartsEnabled}
        onChange={onChange}
        style={{ marginRight: '8px' }}
      />
      <span
        aria-label={t('Add dashboard owners to all charts.')}
        id="sync-chart-owners-control"
        style={{ marginRight: '4px' }}
      >
        {t('Add dashboard owners to all charts.')}
      </span>
      {showTooltip && (
        <span aria-label={tooltipText}>
          <WarningIconWithTooltip size="s" warningMarkdown={tooltipText} />
        </span>
      )}
    </div>
  );
};
export default SyncChartOwnersControl;
