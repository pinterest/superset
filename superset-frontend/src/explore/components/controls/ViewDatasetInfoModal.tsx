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
import { FC, useState, useCallback, useEffect } from 'react';

import { styled, css, SupersetClient, SupersetTheme } from '@superset-ui/core';
import Loading from 'src/components/Loading';
import ViewQuery from 'src/explore/components/controls/ViewQuery';
import { AntdCollapse } from 'src/components';

interface ViewDatasetInfoModalProps {
  datasetId: number;
}

type TableMetadataField = {
  key: string;
  value: string;
  type: 'string' | 'sql';
};
type TableMetadataResponseType = {
  database_name: string;
  table_metadata: {
    table_name: string;
    metadata_fields: TableMetadataField[] | null;
  }[];
};

const ViewDatasetInfoModalContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const MetadataField = (theme: SupersetTheme) => css`
  .metadata-key {
    font-weight: ${theme.typography.weights.normal};
    font-size: ${theme.typography.sizes.m}px;
    color: ${theme.colors.grayscale.base};
    margin-bottom: ${theme.gridUnit * 2}px;
  }
  .metadata-value {
    font-weight: ${theme.typography.weights.normal};
    font-size: ${theme.typography.sizes.m}px;
    color: ${theme.colors.grayscale.dark1};
    margin-bottom: ${theme.gridUnit * 2}px;
  }
`;

const TableMetadataHeader = (theme: SupersetTheme) => css`
  font-weight: ${theme.typography.weights.bold};
  font-size: ${theme.typography.sizes.l}px;
  color: ${theme.colors.grayscale.dark1};
  .table-name {
    color: ${theme.colors.info.dark1};
  }
`;
const ViewDatasetInfoModal: FC<ViewDatasetInfoModalProps> = ({ datasetId }) => {
  const [result, setResult] = useState<TableMetadataResponseType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDatasetTableMetadata = useCallback((datasetId: number) => {
    setIsLoading(true);
    SupersetClient.get({
      endpoint: `/api/v1/dataset/${datasetId}/table_metadata`,
    })
      .then(({ json }) => {
        setIsLoading(false);
        setResult(json.result);
      })
      .catch(err => {
        setIsLoading(false);
        setError(err.message);
        setResult(null);
      });
  }, []);

  useEffect(() => {
    getDatasetTableMetadata(datasetId);
  }, [datasetId, getDatasetTableMetadata]);

  if (isLoading) {
    return <Loading />;
  }
  if (error || !result) {
    return <pre>{error}</pre>;
  }

  return (
    <ViewDatasetInfoModalContainer>
      <AntdCollapse expandIconPosition="right" ghost>
        {result.table_metadata.map(({ table_name, metadata_fields }) => (
          <AntdCollapse.Panel
            header={
              <div css={TableMetadataHeader}>
                <span>Table: </span>
                <span className="table-name">{table_name}</span>
              </div>
            }
            key={table_name}
          >
            {metadata_fields ? (
              metadata_fields.map(({ key, value, type }) => (
                <div key={`${table_name}-${key}`} css={MetadataField}>
                  <div className="metadata-key">{key}</div>
                  {type !== 'sql' ? (
                    <div className="metadata-value">{value}</div>
                  ) : (
                    <ViewQuery sql={value} language="sql" />
                  )}
                </div>
              ))
            ) : (
              <div>No additional table information available</div>
            )}
          </AntdCollapse.Panel>
        ))}
      </AntdCollapse>
    </ViewDatasetInfoModalContainer>
  );
};

export default ViewDatasetInfoModal;
