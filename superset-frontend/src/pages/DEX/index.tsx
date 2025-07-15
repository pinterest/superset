import { ExplorePageState, SaveActionType } from 'src/explore/types';
import { LocalStorageKeys, setItem } from 'src/utils/localStorageHelpers';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import ExploreViewContainer from 'src/explore/components/ExploreViewContainer';
import { INITIAL_SIZES } from 'src/explore/components/ExploreChartPanel';
import Loading from 'src/components/Loading';
import { SupersetClient } from '@superset-ui/core';
import { URL_PARAMS } from 'src/constants';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { fallbackExploreInitialData } from 'src/explore/fixtures';
import { fetchExploreData } from 'src/pages/Chart';
import { getParsedExploreURLParams } from 'src/explore/exploreUtils/getParsedExploreURLParams';
import { getUrlParam } from 'src/utils/urlUtils';
import { hydrateExplore } from 'src/explore/actions/hydrateExplore';
import { setDatasource } from 'src/explore/actions/datasourcesActions';

export default function DEX() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  const isExploreInitialized = useRef(false);
  const history = useHistory();
  const location = useLocation();

  const longDatasetId = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_LONG_DATASET_ID,
  );
  const wideDatasetId = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_WIDE_DATASET_ID,
  );

  useEffect(() => {
    const exploreUrlParams = getParsedExploreURLParams(location);
    const currentDatasourceId = exploreUrlParams.get('datasource_id');
    const currentDatasourceType = exploreUrlParams.get('datasource_type');
    const currentVizType = exploreUrlParams.get('viz_type');

    // Check if required parameters are missing or incorrect
    const needsUpdate =
      !currentDatasourceId ||
      !currentDatasourceType ||
      currentVizType !== 'dex';

    if (needsUpdate) {
      // Create new URLSearchParams with current params and defaults
      const newParams = new URLSearchParams(location.search);

      // Set defaults if missing
      if (!currentDatasourceId) {
        newParams.set('datasource_id', wideDatasetId as string);
      }
      if (!currentDatasourceType) {
        newParams.set('datasource_type', 'table');
      }
      if (currentVizType !== 'dex') {
        newParams.set('viz_type', 'dex');
      }

      // Update the location
      const newUrl = `${location.pathname}?${newParams.toString()}`;
      history.replace(newUrl);
      return; // Exit early, the effect will run again with the new location
    }

    const saveAction = getUrlParam(
      URL_PARAMS.saveAction,
    ) as SaveActionType | null;
    if (!isExploreInitialized.current || !!saveAction) {
      fetchExploreData(exploreUrlParams)
        .then(({ result }) => {
          dispatch(
            hydrateExplore({
              ...result,
              form_data: {
                ...result.form_data,
                viz_type: 'dex',
              },
              saveAction,
            }),
          );
        })
        .catch(err => {
          dispatch(hydrateExplore(fallbackExploreInitialData));
          dispatch(addDangerToast(err.message));
        })
        .finally(() => {
          setIsLoaded(true);
          isExploreInitialized.current = true;
        });
    }
    // Ensure that the height of the chart panel is set to 100%
    setItem(
      LocalStorageKeys.ChartSplitSizes,
      INITIAL_SIZES as [number, number],
    );
  }, [dispatch, wideDatasetId, location, history]);

  useEffect(() => {
    // Fetch and set both long and wide datasources
    const fetchDatasources = async () => {
      try {
        const [longResponse, wideResponse] = await Promise.all([
          SupersetClient.get({
            endpoint: `/api/v1/dataset/${longDatasetId}`,
          }),
          SupersetClient.get({
            endpoint: `/api/v1/dataset/${wideDatasetId}`,
          }),
        ]);

        const longDataset = longResponse.json.result;
        const wideDataset = wideResponse.json.result;

        // Set both datasources in the store
        dispatch(setDatasource(longDataset));
        dispatch(setDatasource(wideDataset));
      } catch (error) {
        console.error('Error fetching datasources:', error);
        dispatch(addDangerToast('Failed to load datasources'));
      }
    };

    if (longDatasetId && wideDatasetId) {
      fetchDatasources();
    }
  }, [dispatch, longDatasetId, wideDatasetId]);

  return isLoaded ? <ExploreViewContainer /> : <Loading />;
}
