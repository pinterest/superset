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
import { useState, FC } from 'react';
import { useSelector } from 'react-redux';

import { css, t, useTheme } from '@superset-ui/core';
import { AntdDropdown } from 'src/components';
import { Menu } from 'src/components/Menu';
import Label from 'src/components/Label';
import { Tooltip } from 'src/components/Tooltip';
import Button from 'src/components/Button';
import ErrorAlert from 'src/components/ErrorMessage/ErrorAlert';
import Modal from 'src/components/Modal';

export interface AlertsLabelProps {
  onWardenAlert?: () => void;
  onSqlAlert?: () => void;
  className?: string;
}

const ALERT_LIST_PATH = '/alert/list/';

const AlertsLabel: FC<AlertsLabelProps> = ({
  className,
  onWardenAlert,
  onSqlAlert = () => window.location.assign(ALERT_LIST_PATH),
}) => {
  const [hovered, setHovered] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const theme = useTheme();

  const datasource = useSelector((state: any) => state.explore?.datasource);
  const databaseBackend = datasource?.database?.backend;
  const databaseName = datasource?.database?.name;
  const datasourceName = datasource?.name;

  const labelType = hovered ? 'primary' : 'default';

  const handleWardenAlert = () => {
    // eslint-disable-next-line no-console
    console.log('Database backend:', databaseBackend);
    // eslint-disable-next-line no-console
    console.log('Database name:', databaseName);
    // eslint-disable-next-line no-console
    console.log('Datasource name:', datasourceName);
    setShowErrorAlert(true);
    onWardenAlert?.();
  };

  const menu = (
    <Menu
      onClick={({ key }) => {
        if (key === 'warden-alert') {
          handleWardenAlert();
        } else if (key === 'sql-alert') {
          onSqlAlert?.();
        }
      }}
    >
      <Menu.Item key="warden-alert">{t('Warden Alert')}</Menu.Item>
      <Menu.Item key="sql-alert">{t('SQL Alert')}</Menu.Item>
    </Menu>
  );

  return (
    <>
      <AntdDropdown
        overlay={menu}
        trigger={['click']}
        overlayStyle={{ zIndex: theme.zIndex.max }}
      >
        <span>
          <Tooltip
            title={t('Create an alert for this chart')}
            id="alerts-label-tooltip"
          >
            <Label
              className={className}
              css={css`
                gap: ${theme.gridUnit * 0.5}px;
              `}
              type={labelType}
              onMouseOver={() => setHovered(true)}
              onMouseOut={() => setHovered(false)}
            >
              {t('Setup alert')}
            </Label>
          </Tooltip>
        </span>
      </AntdDropdown>
      <Modal
        title={t('Unexpected error')}
        show={showErrorAlert}
        onHide={() => setShowErrorAlert(false)}
        footer={
          <Button
            buttonStyle="primary"
            onClick={() => setShowErrorAlert(false)}
            cta
          >
            {t('Close')}
          </Button>
        }
      >
        <ErrorAlert
          errorType={t('Unexpected error')}
          message={`backend: ${databaseBackend}, database name: ${databaseName}, datasource name: ${datasourceName}`}
          closable={false}
        />
      </Modal>
    </>
  );
};

export default AlertsLabel;
