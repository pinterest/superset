from typing import Any, Optional

import pandas as pd

from superset.utils.core import DTTM_ALIAS

DEFAULT_ALGORITHM = "isolation_forest"


def anomaly_detection(
    df: pd.DataFrame,
    algorithm: str = DEFAULT_ALGORITHM,
    index: Optional[str] = None,
    **algorithm_params: Any,
) -> pd.DataFrame:
    """
    Performs anomaly detection on each series in the time-series DataFrame.
    For each series, adds two new columns suffixed as follows:

    - `_is_anomaly`: 1 if the data point is an anomaly, 0 if otherwise
    - `_anomaly_score`: anomaly score for each data point, normalized between 0 and 1;
                        0 if not an anomaly

    The column with `_anomaly_score` suffix is technically optional. If not present,
    all anomalies will be assigned a score of 0.5.

    Multiple detection algorithms are supported. The ``algorithm`` argument selects
    which one to run, and the remaining keyword arguments are forwarded as-is to that
    algorithm. Each algorithm declares its own parameters (for example, the isolation
    forest accepts ``contamination_rate`` and seasonality flags, while the z-score
    accepts ``z_score_threshold`` and ``sliding_window``). See the algorithm runbook
    for how to onboard a new algorithm.

    :param df: DataFrame containing time-series data
    :param algorithm: identifier of the anomaly detection algorithm to run
    :param index: the name of the column containing the x-axis data
    :param algorithm_params: algorithm-specific keyword parameters
    :return: DataFrame with anomaly detection results, with temporal column at
        beginning if present
    """
    # Lazy import to avoid circular import with superset.config
    from superset.config import ANOMALY_DETECTION

    if not ANOMALY_DETECTION:
        raise ValueError("ANOMALY_DETECTION function is not configured.")

    df = df.copy()
    index = index or DTTM_ALIAS

    return ANOMALY_DETECTION(
        df,
        algorithm=algorithm,
        index=index,
        **algorithm_params,
    )
