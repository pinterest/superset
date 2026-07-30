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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DTTM_ALIAS,
  BinaryQueryObjectFilterClause,
  AxisType,
  getTimeFormatter,
  getColumnLabel,
  getNumberFormatter,
  LegendState,
  ensureIsArray,
  styled,
  t,
} from '@superset-ui/core';
import type { ViewRootGroup } from 'echarts/types/src/util/types';
import type GlobalModel from 'echarts/types/src/model/Global';
import type ComponentModel from 'echarts/types/src/model/Component';
import { EchartsHandler, EventHandlers } from '../types';
import Echart from '../components/Echart';
import { TimeseriesChartTransformedProps } from './types';
import { formatSeriesName } from '../utils/series';
import { ExtraControls } from '../components/ExtraControls';
import {
  AnomalyExplanationDetail,
  getAnomalyExplanationFromClick,
} from '../utils/anomalyDetection';

const TIMER_DURATION = 300;

/* eslint-disable theme-colors/no-literal-colors --
   translucent modal overlay and drop shadow have no dedicated theme token */
const AnomalyExplanationBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1030;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
`;

const AnomalyExplanationCard = styled.div`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;
    width: 90%;
    max-width: 560px;
    max-height: 70vh;
    background: ${theme.colors.grayscale.light5};
    color: ${theme.colors.grayscale.dark2};
    border-radius: ${theme.gridUnit}px;
    box-shadow: 0 ${theme.gridUnit}px ${theme.gridUnit * 6}px
      rgba(0, 0, 0, 0.25);
    overflow: hidden;
  `}
`;
/* eslint-enable theme-colors/no-literal-colors */

const AnomalyExplanationHeader = styled.div`
  ${({ theme }) => `
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${theme.gridUnit * 2}px;
    padding: ${theme.gridUnit * 3}px ${theme.gridUnit * 4}px;
    border-bottom: 1px solid ${theme.colors.grayscale.light2};
  `}
`;

const AnomalyExplanationTitle = styled.div`
  ${({ theme }) => `
    font-weight: ${theme.typography.weights.bold};
    color: ${theme.colors.error.base};
    margin-bottom: ${theme.gridUnit}px;
  `}
`;

const AnomalyExplanationMeta = styled.div`
  ${({ theme }) => `
    font-size: ${theme.typography.sizes.s}px;
    color: ${theme.colors.grayscale.dark1};
  `}
`;

const AnomalyExplanationClose = styled.button`
  ${({ theme }) => `
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: ${theme.typography.sizes.xl}px;
    line-height: 1;
    color: ${theme.colors.grayscale.base};
    padding: 0;
  `}
`;

const AnomalyExplanationBody = styled.div`
  ${({ theme }) => `
    padding: ${theme.gridUnit * 3}px ${theme.gridUnit * 4}px;
    overflow-y: auto;
    white-space: pre-line;
    word-break: break-word;
    line-height: 1.5;
    color: ${theme.colors.grayscale.dark2};
  `}
`;

export default function EchartsTimeseries({
  formData,
  height,
  width,
  echartOptions,
  groupby,
  labelMap,
  selectedValues,
  setDataMask,
  setControlValue,
  legendData = [],
  onContextMenu,
  onLegendStateChanged,
  onFocusedSeries,
  xValueFormatter,
  xAxis,
  refs,
  emitCrossFilters,
  coltypeMapping,
  onLegendScroll,
}: TimeseriesChartTransformedProps) {
  const { stack } = formData;
  const echartRef = useRef<EchartsHandler | null>(null);
  // eslint-disable-next-line no-param-reassign
  refs.echartRef = echartRef;
  const clickTimer = useRef<ReturnType<typeof setTimeout>>();
  const extraControlRef = useRef<HTMLDivElement>(null);
  const [extraControlHeight, setExtraControlHeight] = useState(0);
  const [anomalyDetail, setAnomalyDetail] =
    useState<AnomalyExplanationDetail | null>(null);
  useEffect(() => {
    const element = extraControlRef.current;
    if (!element) {
      setExtraControlHeight(0);
      return;
    }

    const updateHeight = () => {
      setExtraControlHeight(element.offsetHeight || 0);
    };

    updateHeight();

    if (typeof ResizeObserver === 'function') {
      const resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });
      resizeObserver.observe(element);
      return () => {
        resizeObserver.disconnect();
      };
    }

    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [formData.showExtraControls]);

  useEffect(() => {
    if (!anomalyDetail) {
      return undefined;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAnomalyDetail(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anomalyDetail]);

  const hasDimensions = ensureIsArray(groupby).length > 0;

  const getModelInfo = (target: ViewRootGroup, globalModel: GlobalModel) => {
    let el = target;
    let model: ComponentModel | null = null;
    while (el) {
      // eslint-disable-next-line no-underscore-dangle
      const modelInfo = el.__ecComponentInfo;
      if (modelInfo != null) {
        model = globalModel.getComponent(modelInfo.mainType, modelInfo.index);
        break;
      }
      el = el.parent;
    }
    return model;
  };

  const getCrossFilterDataMask = useCallback(
    (value: string) => {
      const selected: string[] = Object.values(selectedValues);
      let values: string[];
      if (selected.includes(value)) {
        values = selected.filter(v => v !== value);
      } else {
        values = [value];
      }
      const groupbyValues = values.map(value => labelMap[value]);
      return {
        dataMask: {
          extraFormData: {
            filters:
              values.length === 0
                ? []
                : groupby.map((col, idx) => {
                    const val = groupbyValues.map(v => v[idx]);
                    if (val === null || val === undefined)
                      return {
                        col,
                        op: 'IS NULL' as const,
                      };
                    return {
                      col,
                      op: 'IN' as const,
                      val: val as (string | number | boolean)[],
                    };
                  }),
          },
          filterState: {
            label: groupbyValues.length ? groupbyValues : undefined,
            value: groupbyValues.length ? groupbyValues : null,
            selectedValues: values.length ? values : null,
          },
        },
        isCurrentValueSelected: selected.includes(value),
      };
    },
    [groupby, labelMap, selectedValues],
  );

  // Cross-filter using X-axis value when no dimensions are set (issue #25334)
  const getXAxisCrossFilterDataMask = useCallback(
    (xAxisValue: string | number) => {
      const stringValue = String(xAxisValue);
      const selected: string[] = Object.values(selectedValues);
      let values: string[];
      if (selected.includes(stringValue)) {
        values = selected.filter(v => v !== stringValue);
      } else {
        values = [stringValue];
      }
      return {
        dataMask: {
          extraFormData: {
            filters:
              values.length === 0
                ? []
                : [
                    {
                      col: xAxis.label,
                      op: 'IN' as const,
                      val: values,
                    },
                  ],
          },
          filterState: {
            label: values.length ? values : undefined,
            value: values.length ? values : null,
            selectedValues: values.length ? values : null,
          },
        },
        isCurrentValueSelected: selected.includes(stringValue),
      };
    },
    [selectedValues, xAxis.label],
  );

  const handleChange = useCallback(
    (value: string) => {
      if (!emitCrossFilters) {
        return;
      }
      setDataMask(getCrossFilterDataMask(value).dataMask);
    },
    [emitCrossFilters, setDataMask, getCrossFilterDataMask],
  );

  // Handle cross-filter using X-axis value when no dimensions (issue #25334)
  const handleXAxisChange = useCallback(
    (xAxisValue: string | number) => {
      if (!emitCrossFilters) {
        return;
      }
      setDataMask(getXAxisCrossFilterDataMask(xAxisValue).dataMask);
    },
    [emitCrossFilters, setDataMask, getXAxisCrossFilterDataMask],
  );

  // Determine if X-axis can be used for cross-filtering (categorical axis without dimensions)
  const canCrossFilterByXAxis =
    !hasDimensions && xAxis.type === AxisType.Category;

  const eventHandlers: EventHandlers = {
    click: props => {
      // Clicking an anomaly point opens the full explanation in a modal. This
      // is handled before the cross-filter logic (and works even without
      // dimensions) so it also applies to charts without a groupby.
      const anomaly = getAnomalyExplanationFromClick(props);
      if (anomaly) {
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
        }
        setAnomalyDetail(anomaly);
        return;
      }
      // Allow cross-filter by dimensions OR by categorical X-axis (issue #25334)
      if (!hasDimensions && !canCrossFilterByXAxis) {
        return;
      }
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
      }
      // Ensure that double-click events do not trigger single click event. So we put it in the timer.
      clickTimer.current = setTimeout(() => {
        if (hasDimensions) {
          // Cross-filter by dimension (original behavior)
          const { seriesName: name } = props;
          handleChange(name);
        } else if (canCrossFilterByXAxis && props.data?.[0] != null) {
          // Cross-filter by X-axis value when no dimensions (issue #25334)
          handleXAxisChange(props.data[0]);
        }
      }, TIMER_DURATION);
    },
    mouseout: () => {
      onFocusedSeries(null);
    },
    mouseover: params => {
      onFocusedSeries(params.seriesName);
    },
    legendscroll: payload => {
      onLegendScroll?.(payload.scrollDataIndex);
    },
    legendselectchanged: payload => {
      onLegendStateChanged?.(payload.selected);
    },
    legendselectall: payload => {
      onLegendStateChanged?.(payload.selected);
    },
    legendinverseselect: payload => {
      onLegendStateChanged?.(payload.selected);
    },
    contextmenu: async eventParams => {
      if (onContextMenu) {
        eventParams.event.stop();
        const { data, seriesName } = eventParams;
        const drillToDetailFilters: BinaryQueryObjectFilterClause[] = [];
        const drillByFilters: BinaryQueryObjectFilterClause[] = [];
        const pointerEvent = eventParams.event.event;
        const values = [
          ...(eventParams.name ? [eventParams.name] : []),
          ...(labelMap[seriesName] ?? []),
        ];
        const groupBy = ensureIsArray(formData.groupby);
        if (data && xAxis.type === AxisType.Time) {
          drillToDetailFilters.push({
            col:
              // if the xAxis is '__timestamp', granularity_sqla will be the column of filter
              xAxis.label === DTTM_ALIAS
                ? formData.granularitySqla
                : xAxis.label,
            grain: formData.timeGrainSqla,
            op: '==',
            val: data[0],
            formattedVal: xValueFormatter(data[0]),
          });
        }
        [
          ...(xAxis.type === AxisType.Category && data ? [xAxis.label] : []),
          ...groupBy,
        ].forEach((dimension, i) =>
          drillToDetailFilters.push({
            col: dimension,
            op: '==',
            val: values[i],
            formattedVal: String(values[i]),
          }),
        );
        groupBy.forEach((dimension, i) => {
          const dimensionValues = labelMap[seriesName] ?? [];

          // Skip the metric values at the beginning and get the actual dimension value
          // If we have multiple metrics, they come first, then the dimension values
          const metricsCount = dimensionValues.length - groupBy.length;
          const val = dimensionValues[metricsCount + i];

          drillByFilters.push({
            col: dimension,
            op: '==',
            val,
            formattedVal: formatSeriesName(val, {
              timeFormatter: getTimeFormatter(formData.dateFormat),
              numberFormatter: getNumberFormatter(formData.numberFormat),
              coltype: coltypeMapping?.[getColumnLabel(dimension)],
            }),
          });
        });

        // Provide cross-filter for dimensions OR categorical X-axis (issue #25334)
        let crossFilter;
        if (hasDimensions) {
          crossFilter = getCrossFilterDataMask(seriesName);
        } else if (canCrossFilterByXAxis && data?.[0] != null) {
          crossFilter = getXAxisCrossFilterDataMask(data[0]);
        }

        onContextMenu(pointerEvent.clientX, pointerEvent.clientY, {
          drillToDetail: drillToDetailFilters,
          drillBy: { filters: drillByFilters, groupbyFieldName: 'groupby' },
          crossFilter,
        });
      }
    },
  };

  const zrEventHandlers: EventHandlers = {
    dblclick: params => {
      // clear single click timer
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
      }
      const pointInPixel = [params.offsetX, params.offsetY];
      const echartInstance = echartRef.current?.getEchartInstance();
      if (echartInstance?.containPixel('grid', pointInPixel)) {
        // do not trigger if click unstacked chart's blank area
        if (!stack && params.target?.type === 'ec-polygon') return;
        // @ts-expect-error
        const globalModel = echartInstance.getModel();
        const model = getModelInfo(params.target, globalModel);
        if (model) {
          const { name } = model;
          const legendState: LegendState = legendData.reduce(
            (previous, datum) => ({
              ...previous,
              [datum]: datum === name,
            }),
            {},
          );
          onLegendStateChanged?.(legendState);
        }
      }
    },
  };

  return (
    <>
      <div ref={extraControlRef}>
        <ExtraControls formData={formData} setControlValue={setControlValue} />
      </div>
      <Echart
        ref={echartRef}
        refs={refs}
        height={height - extraControlHeight}
        width={width}
        echartOptions={echartOptions}
        eventHandlers={eventHandlers}
        zrEventHandlers={zrEventHandlers}
        selectedValues={selectedValues}
        vizType={formData.vizType}
      />
      {anomalyDetail && (
        <AnomalyExplanationBackdrop
          role="dialog"
          aria-modal="true"
          aria-label={t('Anomaly explanation')}
          onClick={() => setAnomalyDetail(null)}
        >
          <AnomalyExplanationCard onClick={e => e.stopPropagation()}>
            <AnomalyExplanationHeader>
              <div>
                <AnomalyExplanationTitle>
                  🚨 {t('Anomaly explanation')}
                </AnomalyExplanationTitle>
                <AnomalyExplanationMeta>
                  {anomalyDetail.seriesName}
                  {typeof anomalyDetail.score === 'number'
                    ? ` · ${t('score')} ${anomalyDetail.score.toFixed(3)}`
                    : ''}
                  {typeof anomalyDetail.xValue === 'number'
                    ? ` · ${xValueFormatter(anomalyDetail.xValue)}`
                    : anomalyDetail.xValue
                      ? ` · ${anomalyDetail.xValue}`
                      : ''}
                </AnomalyExplanationMeta>
              </div>
              <AnomalyExplanationClose
                type="button"
                onClick={() => setAnomalyDetail(null)}
                aria-label={t('Close')}
              >
                ×
              </AnomalyExplanationClose>
            </AnomalyExplanationHeader>
            <AnomalyExplanationBody>
              {anomalyDetail.explanation}
            </AnomalyExplanationBody>
          </AnomalyExplanationCard>
        </AnomalyExplanationBackdrop>
      )}
    </>
  );
}
