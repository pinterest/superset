# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
import logging
from typing import Optional, Union

import pandas as pd
from flask_babel import gettext as _
from pandas import DataFrame

from superset.exceptions import InvalidPostProcessingError
from superset.utils.core import DTTM_ALIAS
from superset.utils.decorators import suppress_logging
import requests

def anomaly_detection (  # pylint: disable=too-many-arguments
    df: DataFrame,
    time_grain: str,
    periods: int,
    confidence_interval: float,
    yearly_seasonality: Optional[Union[bool, int]] = None,
    weekly_seasonality: Optional[Union[bool, int]] = None,
    daily_seasonality: Optional[Union[bool, int]] = None,
    index: Optional[str] = None,
):
    import requests
    import json
    """
    Calling AnomalyDetection Service API to detect anomalies
    """

    # TODO - move to custom Pinterest config
    URL = 'http://warden-test-0a01b4f0:8080/detect'
    default_anomaly_detection_config = {
      "name": "warden_superset_default",
      "owner": "warden",
#       "modelConfig": {
#         "library": "EGADS",
#         "tsModel": "MovingAverageModel",
#         "tsUnit": "DAY",
#         "adModels": [
#           "ExtremeLowDensityModel",
#           "KSigmaModel",
#           "NaiveModel",
#           "DBScanModel"
#         ],
#         "minAdModelConfirmNeeded": 1,
#         "resultWithOnlyAnomalies": True,
#         "skipLowerObservedDetection": False,
#         "fillMissingTimestamps": False,
#         "parameters": {
#           "THRESHOLD": "mapee#1.0||mae#1.0||smape#1.0||mape#1.0||mase#1.0",
#           "MAX_ANOMALY_TIME_AGO": 999999
#         }
#       },
      "modelConfig": {
       "tsUnit": "DAY",
       "externalAnalyticsModule": "simple_anomaly_detection.isolation_forest",
      "externalAnalyticsInterface": "SimpleAnomalyDetection",
       "externalAnalyticsParams": {
         "contamination_rate": 0.05, # rough percentage of expected outliers
         "lookback": 600, # want to find anomalies only in last 90 days
         "random_state": 42, # random seed
       },
       "fillMissingTimestamps": False,
      },
      "alertConfig": {
        "notifications": [
          {
            "method": "SLACK",
            "channel": "#cs-test",
            "showAll": "True"
          }
        ]
      },
      "sourceData" : {
          "timestampField": "create_timestamp",
          "data": {}
      }
    }

    # send request to anomaly detection service
    df.sort_values(by='create_timestamp', ascending=True, inplace=True)
    df_json = json.loads(df.to_json(orient='columns'))
    default_anomaly_detection_config["sourceData"]["data"] = df_json
    response = requests.post(URL, json=default_anomaly_detection_config)
    if response.status_code != 200:
        return df
    result = json.loads(response.text)

    # populate anomalyAnnotationData column with empty set
    df['anomalyAnnotationData'] = [set() for i in range(len(df_json['create_timestamp']))]
    columns = df_json['create_timestamp']
    annotations_dict = {}
    try:
        for r in result:
            ts_name = r['dimKey']['columns'][0]
            index = 0
            anomalies = set(r['anomalyTimePoints'])
            for ts in r['timeSeries']:
                if (columns[str(index)] in anomalies):
                    df.at[index, 'anomalyAnnotationData'].add(ts_name)
                index = index + 1
    except Exception as e:
        logging.error("Error processing anomalies:" + repr(e))

    return df
