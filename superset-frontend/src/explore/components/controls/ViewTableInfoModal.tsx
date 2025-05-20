import { FC, useState, useCallback, useEffect } from 'react';

import { styled, css, SupersetClient, SupersetTheme } from '@superset-ui/core';
import Loading from 'src/components/Loading';
import ViewQuery from 'src/explore/components/controls/ViewQuery';
import { AntdCollapse } from 'src/components';

interface ViewTableInfoModalProps {
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

const ViewTableInfoModalContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const TableMetadataInfo = (theme: SupersetTheme) => css`
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

  .no-metadata {
    color: ${theme.colors.grayscale.light1};
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
const ViewTableInfoModal: FC<ViewTableInfoModalProps> = ({ datasetId }) => {
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
    <ViewTableInfoModalContainer>
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
            <div css={TableMetadataInfo}>
              {metadata_fields ? (
                metadata_fields.map(({ key, value, type }) => (
                  <div key={`${table_name}-${key}`}>
                    <div className="metadata-key">{key}</div>
                    {type !== 'sql' ? (
                      <div className="metadata-value">{value}</div>
                    ) : (
                      <ViewQuery sql={value} language="sql" />
                    )}
                  </div>
                ))
              ) : (
                <div className="no-metadata">
                  No additional table information available
                </div>
              )}
            </div>
          </AntdCollapse.Panel>
        ))}
      </AntdCollapse>
    </ViewTableInfoModalContainer>
  );
};

export default ViewTableInfoModal;
