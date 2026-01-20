from typing import Optional

import pandas as pd

from superset.utils.core import DTTM_ALIAS


def anomaly_detection(
    df: pd.DataFrame,
    contamination_rate: float,
    detrend: Optional[bool] = True,
    yearly_seasonality: Optional[bool] = True,
    monthly_seasonality: Optional[bool] = True,
    weekly_seasonality: Optional[bool] = False,
    index: Optional[str] = None,
) -> pd.DataFrame:
    """
    Performs anomaly detection on each series in the time-series DataFrame.
    For each series, adds two new columns suffixed as follows:

    - `_is_anomaly`: 1 if the data point is an anomaly, 0 if otherwise
    - `_anomaly_score`: anomaly score for each data point, normalized between 0 and 1;
                        0 if not an anomaly

    The column with `_anomaly_score` suffix is technically optional. If not present,
    all anomalies will be assigned a score of 0.5.

    :param df: DataFrame containing time-series data
    :param contamination_rate: the proportion of data points per series that could be
        anomalies
    :param detrend: whether to detrend each series before detecting anomalies
    :param yearly_seasonality: whether to account for yearly seasonality in each series
    :param monthly_seasonality: whether to account for monthly seasonality in each
        series
    :param weekly_seasonality: whether to account for weekly seasonality in each series
    :param index: the name of the column containing the x-axis data
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
        contamination_rate,
        detrend,
        yearly_seasonality,
        monthly_seasonality,
        weekly_seasonality,
        index,
    )
