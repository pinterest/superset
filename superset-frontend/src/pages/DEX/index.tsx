import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExploreData } from 'src/pages/Chart';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { getUrlParam } from 'src/utils/urlUtils';
import { ExplorePageState, SaveActionType } from 'src/explore/types';
import { hydrateExplore } from 'src/explore/actions/hydrateExplore';
import { URL_PARAMS } from 'src/constants';
import { fallbackExploreInitialData } from 'src/explore/fixtures';
import Loading from 'src/components/Loading';
import ExploreViewContainer from 'src/explore/components/ExploreViewContainer';

export default function DEX() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  const isExploreInitialized = useRef(false);

  const datasetId = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_DATASET_ID,
  );

  useEffect(() => {
    const exploreUrlParams = new URLSearchParams({
      datasource_id: datasetId as string,
      datasource_type: 'table',
      viz_type: 'dex',
    });
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
  }, [dispatch, datasetId]);
  return isLoaded ? <ExploreViewContainer /> : <Loading />;
}
