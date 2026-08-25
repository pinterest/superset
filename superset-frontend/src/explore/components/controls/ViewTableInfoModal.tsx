import { FC, useState, useCallback, useEffect } from 'react';

import { t } from '@apache-superset/core/translation';
import { SupersetClient } from '@superset-ui/core';
import { styled, css, SupersetTheme } from '@apache-superset/core/theme';
import { Collapse, Loading } from '@superset-ui/core/components';
import ViewQuery from 'src/explore/components/controls/ViewQuery';

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
    font-weight: ${theme.fontWeightNormal};
    font-size: ${theme.fontSize}px;
    color: ${theme.colorText};
    margin-bottom: ${theme.sizeUnit * 2}px;
  }
  .metadata-value {
    font-weight: ${theme.fontWeightNormal};
    font-size: ${theme.fontSize}px;
    color: ${theme.colorTextSecondary};
    margin-bottom: ${theme.sizeUnit * 2}px;
  }

  .no-metadata {
    color: ${theme.colorTextDescription};
  }
`;

const TableMetadataHeader = (theme: SupersetTheme) => css`
  font-weight: ${theme.fontWeightStrong};
  font-size: ${theme.fontSizeLG}px;
  color: ${theme.colorTextSecondary};
  .table-name {
    color: ${theme.colorInfo};
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
      <Collapse expandIconPosition="right" ghost>
        {result.table_metadata.map(({ table_name, metadata_fields }) => (
          <Collapse.Panel
            header={
              <div css={TableMetadataHeader}>
                <span>{t('Table:')} </span>
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
                      <ViewQuery
                        sql={value}
                        datasource={`${datasetId}__table`}
                        language="sql"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="no-metadata">
                  {t('No additional table information available')}
                </div>
              )}
            </div>
          </Collapse.Panel>
        ))}
      </Collapse>
    </ViewTableInfoModalContainer>
  );
};

export default ViewTableInfoModal;
