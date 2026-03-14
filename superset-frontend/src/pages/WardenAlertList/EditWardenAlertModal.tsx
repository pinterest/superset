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
import { useState, useEffect, useMemo } from 'react';
import rison from 'rison';
import {
  css,
  getClientErrorObject,
  SupersetClient,
  t,
  useTheme,
} from '@superset-ui/core';
import { AsyncSelect, Select, AntdCheckbox } from 'src/components';
import { Tooltip } from 'src/components/Tooltip';
import Button from 'src/components/Button';
import Icons from 'src/components/Icons';
import Modal from 'src/components/Modal';
import Collapse from 'src/components/Collapse';
import StyledPanel from 'src/features/alerts/components/StyledPanel';
import Loading from 'src/components/Loading';
import { JsonEditor } from 'src/components/AsyncAceEditor';

interface EditWardenAlertModalProps {
  alertId: number | null;
  show: boolean;
  onHide: () => void;
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  onSaveSuccess?: () => void;
  canEdit?: boolean;
}

export default function EditWardenAlertModal({
  alertId,
  show,
  onHide,
  addDangerToast,
  addSuccessToast,
  onSaveSuccess,
  canEdit = true,
}: EditWardenAlertModalProps) {
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [alertName, setAlertName] = useState('');
  const [active, setActive] = useState(true);
  const [runIntervalValue, setRunIntervalValue] = useState<number | ''>('');
  const [runIntervalUnit, setRunIntervalUnit] = useState('day');
  const [slackRecipients, setSlackRecipients] = useState<
    { label: string; value: string }[]
  >([]);
  const [slackOptions, setSlackOptions] = useState<
    {
      label: string;
      options: { label: string; value: string; key: string }[];
      key: string;
    }[]
  >([]);
  const [slackLoading, setSlackLoading] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [querySql, setQuerySql] = useState('');
  const [database, setDatabase] = useState<
    { value: number | string; label: string; backend?: string } | undefined
  >(undefined);
  const [connectionType, setConnectionType] = useState('');
  const [connectionConfig, setConnectionConfig] = useState<any>(null);
  const [contaminationRate, setContaminationRate] = useState<number | ''>(0.05);
  const [detrend, setDetrend] = useState(true);
  const [yearlySeasonality, setYearlySeasonality] = useState(true);
  const [monthlySeasonality, setMonthlySeasonality] = useState(true);
  const [weeklySeasonality, setWeeklySeasonality] = useState(false);
  const [postProcessing, setPostProcessing] = useState('');
  const [activeCollapseKey, setActiveCollapseKey] = useState<string | string[]>(
    ['warden-config'],
  );

  useEffect(() => {
    if (show && slackOptions.length === 0) {
      setSlackLoading(true);
      const queryString = rison.encode({
        searchString: '',
        types: ['public_channel', 'private_channel'],
        exactMatch: false,
      });
      SupersetClient.get({
        endpoint: `/api/v1/report/slack_channels/?q=${queryString}`,
      })
        .then(({ json }) => {
          const channels = json.result || [];
          const publicChannels: {
            label: string;
            value: string;
            key: string;
          }[] = [];
          const privateChannels: {
            label: string;
            value: string;
            key: string;
          }[] = [];
          channels.forEach((ch: any) => {
            const option = { label: ch.name, value: ch.id, key: ch.id };
            if (ch.is_private) {
              privateChannels.push(option);
            } else {
              publicChannels.push(option);
            }
          });
          setSlackOptions([
            {
              label: t('Public Channels'),
              options: publicChannels,
              key: 'public',
            },
            {
              label: t('Private Channels'),
              options: privateChannels,
              key: 'private',
            },
          ]);
        })
        .catch(() => {
          addDangerToast(t('Failed to load Slack channels.'));
        })
        .finally(() => {
          setSlackLoading(false);
        });
    }
  }, [show]);

  useEffect(() => {
    if (slackOptions.length === 0 || slackRecipients.length === 0) return;
    const allChannels = slackOptions.flatMap(group => group.options);
    const updated = slackRecipients.map(r => {
      const match = allChannels.find(ch => ch.value === r.value);
      return match ? { label: match.label, value: r.value } : r;
    });
    if (updated.some((u, i) => u.label !== slackRecipients[i].label)) {
      setSlackRecipients(updated);
    }
  }, [slackOptions, slackRecipients]);

  useEffect(() => {
    if (!show || alertId == null) return;

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    SupersetClient.get({
      endpoint: `/api/v1/warden/alerts/${alertId}`,
    })
      .then(({ json }) => {
        if (cancelled) return;
        const data = json?.result;
        if (!data) {
          setFetchError(t('Alert not found.'));
          return;
        }
        setAlertName(data.name ?? '');
        setActive(data.active ?? true);
        setRunIntervalValue(data.run_interval_value ?? '');
        setRunIntervalUnit(data.run_interval_unit ?? 'day');
        const notifConfig = data.notification_config ?? {};
        const slackIds = notifConfig.slack_channels ?? notifConfig.slack ?? [];
        setSlackRecipients(
          slackIds.map((id: string) => ({ label: id, value: id })),
        );
        setEmailRecipients(
          (notifConfig.emails ?? notifConfig.email ?? []).join(', '),
        );
        setQuerySql(data.query_sql ?? '');
        setConnectionType(data.connection_type ?? '');
        setConnectionConfig(data.connection_config ?? null);
        const cluster = data.connection_config?.cluster;
        if (cluster) {
          setDatabase({ value: cluster, label: cluster });
        }
        const wc = data.warden_config ?? {};
        setContaminationRate(wc.contamination_rate ?? 0.05);
        setDetrend(wc.detrend ?? true);
        setYearlySeasonality(wc.yearly_seasonality ?? true);
        setMonthlySeasonality(wc.monthly_seasonality ?? true);
        setWeeklySeasonality(wc.weekly_seasonality ?? false);
        if (wc.post_processing != null) {
          setPostProcessing(JSON.stringify(wc.post_processing, null, 2));
        } else {
          setPostProcessing('');
        }
        setActiveCollapseKey(['warden-config']);
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError(t('Failed to load alert details.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, alertId]);

  const SUPPORTED_BACKENDS = ['trino', 'druid', 'snowflake'];

  const isSupportedDatabase = (backend: string, name: string) => {
    if (SUPPORTED_BACKENDS.includes(backend)) return true;
    if (backend === 'mysql' && name?.toLowerCase().startsWith('starrocks')) {
      return true;
    }
    return false;
  };

  const loadDatabaseOptions = useMemo(
    () =>
      (input = '', page: number, pageSize: number) => {
        const query = rison.encode_uri({
          page,
          page_size: pageSize,
        });
        return SupersetClient.get({
          endpoint: `/api/v1/database/?q=${query}`,
        }).then(response => {
          const list = response.json.result
            .filter(
              (item: { backend: string; database_name: string }) =>
                isSupportedDatabase(item.backend, item.database_name),
            )
            .filter(
              (item: { database_name: string }) =>
                !input ||
                item.database_name
                  .toLowerCase()
                  .includes(input.toLowerCase()),
            )
            .map(
              (item: { id: number; database_name: string; backend: string }) => ({
                value: item.id,
                label: item.database_name,
                backend: item.backend,
              }),
            );
          return { data: list, totalCount: list.length };
        });
      },
    [],
  );

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const parsedEmails = emailRecipients
    ? emailRecipients
        .split(/[,;]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  const emailsValid =
    !emailRecipients || parsedEmails.every((e: string) => emailRegex.test(e));

  const notificationValid =
    !!(slackRecipients.length || emailRecipients) && emailsValid;

  const postProcessingValid = (() => {
    const trimmed = postProcessing.trim();
    if (!trimmed) return true;
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  })();

  const isFormValid =
    !!alertName &&
    !!runIntervalValue &&
    !!runIntervalUnit &&
    !!querySql.trim() &&
    postProcessingValid &&
    notificationValid;

  const handleSave = async () => {
    if (!isFormValid || alertId == null) return;

    try {
      await SupersetClient.put({
        endpoint: `/api/v1/warden/alerts/${alertId}`,
        jsonPayload: {
          name: alertName,
          active: active,
          run_interval_value: runIntervalValue,
          run_interval_unit: runIntervalUnit,
          query_sql: querySql,
          connection_type: connectionType,
          connection_config: {
            cluster: database?.label ?? connectionConfig?.cluster,
          },
          warden_config: {
            contamination_rate: contaminationRate,
            detrend,
            yearly_seasonality: yearlySeasonality,
            monthly_seasonality: monthlySeasonality,
            weekly_seasonality: weeklySeasonality,
            ...(postProcessing.trim()
              ? { post_processing: JSON.parse(postProcessing) }
              : {}),
          },
          notification_config: {
            slack_channels: slackRecipients.map(r => r.value),
            emails: parsedEmails,
          },
        },
      });
      addSuccessToast(t('Alert updated successfully.'));
      onHide();
      onSaveSuccess?.();
    } catch (response: any) {
      const errObj = await getClientErrorObject(response);
      const message =
        errObj?.message ||
        errObj?.error ||
        t('An error occurred while updating the alert.');
      addDangerToast(message);
    }
  };

  return (
    <Modal
      title={<h4>{canEdit ? t('Edit Warden Alert') : t('View Warden Alert')}</h4>}
      show={show}
      onHide={onHide}
      centered
      responsive
      maxWidth="700px"
      css={css`
        .antd5-modal-body {
          padding: 0 !important;
          height: 70vh;
          overflow-y: auto;
        }

        input[type='text'],
        input[type='number'] {
          padding: ${theme.gridUnit}px ${theme.gridUnit * 2}px;
          border: 1px solid ${theme.colors.grayscale.light2};
          border-radius: ${theme.borderRadius}px;
        }

        input::placeholder {
          color: ${theme.colors.grayscale.light1};
        }
      `}
      footer={
        <>
          <Button onClick={onHide} cta>
            {t('Close')}
          </Button>
          <Tooltip
            title={
              !canEdit
                ? t('Only the owner of the alert can edit this alert.')
                : ''
            }
          >
            <span>
              <Button
                buttonStyle="primary"
                onClick={handleSave}
                disabled={!canEdit || !isFormValid}
                cta
              >
                {t('Save')}
              </Button>
            </span>
          </Tooltip>
        </>
      }
    >
      {loading && <Loading />}
      {fetchError && (
        <div
          css={css`
            padding: ${theme.gridUnit * 4}px;
            color: ${theme.colors.error.base};
            text-align: center;
          `}
        >
          {fetchError}
        </div>
      )}
      {!loading && !fetchError && (
      <fieldset
        disabled={!canEdit}
        css={css`
          border: none;
          padding: 0;
          margin: 0;
          min-inline-size: 0;
        `}
      >
      <Collapse
        expandIconPosition="right"
        activeKey={activeCollapseKey}
        onChange={key => setActiveCollapseKey(key)}
        accordion
        css={css`
          .ant-collapse-item {
            border-bottom: none !important;
          }
        `}
      >
        <StyledPanel
          header={
            <div className="collapse-panel-header">
              <div className="collapse-panel-title">
                <span>{t('General settings')}</span>
              </div>
              <p className="collapse-panel-subtitle">
                {t(
                  'Update alert name, run schedule, warden settings, and notification method for this alert.',
                )}
              </p>
            </div>
          }
          key="warden-config"
        >
          <div
            css={css`
              margin-bottom: 0;

              .control-label {
                font-weight: ${theme.typography.weights.bold};
                margin-bottom: ${theme.gridUnit}px;
              }

              .required {
                margin-left: ${theme.gridUnit / 2}px;
                color: ${theme.colors.error.base};
              }

              .input-container {
                display: flex;
                align-items: center;

                input {
                  flex: 1 1 auto;
                }
              }
            `}
          >
            <div className="control-label">
              {t('Alert name')}
              <span className="required">*</span>
            </div>
            <div className="input-container">
              <input
                type="text"
                name="name"
                value={alertName}
                placeholder={t('Enter alert name')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAlertName(e.target.value)
                }
              />
            </div>
          </div>
          <div
            css={css`
              margin-top: ${theme.gridUnit * 3}px;

              .control-label {
                font-weight: ${theme.typography.weights.bold};
                margin-bottom: ${theme.gridUnit}px;
              }

              .required {
                margin-left: ${theme.gridUnit / 2}px;
                color: ${theme.colors.error.base};
              }
            `}
          >
            <div className="control-label">
              {t('Schedule')}
              <span className="required">*</span>
            </div>
            <div
              css={css`
                display: flex;
                align-items: center;
                gap: ${theme.gridUnit * 2}px;
              `}
            >
              <span css={css`white-space: nowrap;`}>{t('Run every')}</span>
              <input
                type="number"
                min="1"
                step="1"
                value={runIntervalValue}
                placeholder="1"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  if (val === '') {
                    setRunIntervalValue('');
                  } else {
                    const num = parseInt(val, 10);
                    if (num > 0) setRunIntervalValue(num);
                  }
                }}
                css={css`
                  width: 80px;
                `}
              />
              <Select
                ariaLabel={t('Interval unit')}
                value={runIntervalUnit}
                onChange={(val: string) => setRunIntervalUnit(val)}
                options={[
                  { label: t('Year'), value: 'year' },
                  { label: t('Month'), value: 'month' },
                  { label: t('Week'), value: 'week' },
                  { label: t('Day'), value: 'day' },
                  { label: t('Hour'), value: 'hour' },
                ]}
                disabled={!canEdit}
                css={css`
                  width: 140px;
                `}
              />
            </div>
          </div>
          <div
            css={css`
              margin-top: ${theme.gridUnit * 3}px;

              .control-label {
                font-weight: ${theme.typography.weights.bold};
                margin-bottom: ${theme.gridUnit}px;
              }
            `}
          >
            <div className="control-label">
              {t('Warden settings')}
            </div>
            <div
              css={css`
                display: flex;
                align-items: center;
                gap: ${theme.gridUnit * 2}px;
                margin-bottom: ${theme.gridUnit * 2}px;
              `}
            >
              <span css={css`white-space: nowrap;`}>
                {t('Contamination rate')}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={contaminationRate}
                placeholder="0.05"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  if (val === '') {
                    setContaminationRate('');
                  } else {
                    const num = parseFloat(val);
                    if (num >= 0) setContaminationRate(num);
                  }
                }}
                css={css`
                  width: 100px;
                `}
              />
            </div>
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${theme.gridUnit * 1.5}px;

                label[class*='checkbox-wrapper'] {
                  display: flex;
                  align-items: center;
                  margin-left: 0 !important;
                  margin-inline-start: 0 !important;
                }
              `}
            >
              <AntdCheckbox
                checked={detrend}
                disabled={!canEdit}
                onChange={e => setDetrend(e.target.checked)}
              >
                {t('Remove trend from data first')}
              </AntdCheckbox>
              <AntdCheckbox
                checked={yearlySeasonality}
                disabled={!canEdit}
                onChange={e => setYearlySeasonality(e.target.checked)}
              >
                {t('Yearly seasonality')}
              </AntdCheckbox>
              <AntdCheckbox
                checked={monthlySeasonality}
                disabled={!canEdit}
                onChange={e => setMonthlySeasonality(e.target.checked)}
              >
                {t('Monthly seasonality')}
              </AntdCheckbox>
              <AntdCheckbox
                checked={weeklySeasonality}
                disabled={!canEdit}
                onChange={e => setWeeklySeasonality(e.target.checked)}
              >
                {t('Weekly seasonality')}
              </AntdCheckbox>
            </div>
            <div
              css={css`
                margin-top: ${theme.gridUnit * 3}px;
              `}
            >
              <span
                css={css`
                  white-space: nowrap;
                  margin-bottom: ${theme.gridUnit}px;
                  display: block;
                `}
              >
                {t('Post processing (JSON)')}
              </span>
              <JsonEditor
                value={postProcessing}
                onChange={(value: string) => setPostProcessing(value)}
                width="100%"
                height="200px"
                readOnly={!canEdit}
                editorProps={{ $blockScrolling: true }}
              />
            </div>
          </div>
          <div
            css={css`
              margin-top: ${theme.gridUnit * 3}px;

              .control-label {
                font-weight: ${theme.typography.weights.bold};
                margin-bottom: ${theme.gridUnit}px;
              }

              .required {
                margin-left: ${theme.gridUnit / 2}px;
                color: ${theme.colors.error.base};
              }

              .input-container {
                display: flex;
                align-items: center;
                gap: ${theme.gridUnit * 2}px;
                margin-bottom: ${theme.gridUnit * 2}px;

                input {
                  flex: 1 1 auto;
                }
              }
            `}
          >
            <div
              className="control-label"
              css={css`
                display: flex;
                align-items: center;
              `}
            >
              {t('Sending alerts to')}
              <span className="required">*</span>
            </div>
            <div className="input-container">
              <span
                css={css`
                  white-space: nowrap;
                  min-width: 70px;
                  display: inline-flex;
                  align-items: center;
                `}
              >
                {t('Slack')}
                <Tooltip
                  title={t(
                    'Remember to add Warden service to the target Slack channel.',
                  )}
                  id="edit-sending-alerts-tooltip"
                >
                  <Icons.InfoCircleOutlined
                    iconSize="s"
                    css={css`
                      margin-left: ${theme.gridUnit}px;
                      color: ${theme.colors.warning.dark1};
                      cursor: pointer;
                    `}
                  />
                </Tooltip>
              </span>
              <Select
                ariaLabel={t('Select Slack channels')}
                mode="multiple"
                value={slackRecipients}
                options={slackOptions}
                onChange={(val: { label: string; value: string }[]) =>
                  setSlackRecipients(val)
                }
                allowClear
                allowSelectAll={false}
                labelInValue
                loading={slackLoading}
                disabled={!canEdit}
              />
            </div>
            <div className="input-container">
              <span css={css`white-space: nowrap; min-width: 70px;`}>
                {t('Email')}
              </span>
              <div
                css={css`
                  flex: 1 1 auto;
                  position: relative;
                  display: flex;
                  align-items: center;
                `}
              >
                <input
                  type="text"
                  value={emailRecipients}
                  placeholder={t('Recipients are separated by "," or ";"')}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmailRecipients(e.target.value)
                  }
                  css={css`
                    width: 100%;
                  `}
                />
                {emailRecipients && canEdit && (
                  <Icons.CancelSolid
                    role="button"
                    tabIndex={0}
                    onClick={() => setEmailRecipients('')}
                    css={css`
                      position: absolute;
                      right: ${theme.gridUnit * 2}px;
                      cursor: pointer;
                      z-index: 1;
                      font-size: 14px;
                      color: ${theme.colors.grayscale.light1};
                      &:hover {
                        color: ${theme.colors.grayscale.base};
                      }
                    `}
                  />
                )}
              </div>
            </div>
            {!emailsValid && (
              <div
                css={css`
                  color: ${theme.colors.error.base};
                  font-size: ${theme.typography.sizes.s}px;
                  margin-top: ${theme.gridUnit}px;
                `}
              >
                {t(
                  'Invalid email format. Please correct or clear the field, but make sure at least one notification method (Slack or email) is provided.',
                )}
              </div>
            )}
          </div>
        </StyledPanel>
        <StyledPanel
          header={
            <div className="collapse-panel-header">
              <div className="collapse-panel-title">
                <span>{t('Alert SQL')}</span>
              </div>
              <p className="collapse-panel-subtitle">
                {t('Review and edit the database and SQL query for this alert.')}
              </p>
            </div>
          }
          key="alert-sql"
        >
          <div
            css={css`
              .control-label {
                font-weight: ${theme.typography.weights.bold};
                margin-bottom: ${theme.gridUnit}px;
              }
              .required {
                margin-left: ${theme.gridUnit / 2}px;
                color: ${theme.colors.error.base};
              }
              .input-container {
                margin-bottom: ${theme.gridUnit * 3}px;
              }
            `}
          >
            <div className="control-label">
              {t('Database')}
              <span className="required">*</span>
            </div>
            <div className="input-container">
              <AsyncSelect
                ariaLabel={t('Database')}
                name="source"
                placeholder={t('Select database')}
                value={database}
                options={loadDatabaseOptions}
                onChange={(val: any, option: any) => {
                  setDatabase(val);
                  const backend = option?.backend ?? val?.backend;
                  if (backend) setConnectionType(backend);
                }}
                disabled={!canEdit}
              />
            </div>
            <div className="control-label">
              {t('SQL')}
              <span className="required">*</span>
            </div>
            <textarea
              value={querySql}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setQuerySql(e.target.value)
              }
              placeholder={t('SQL will appear here')}
              css={css`
                width: 100%;
                min-height: 200px;
                overflow-y: auto;
                padding: ${theme.gridUnit * 2}px;
                border: 1px solid ${theme.colors.grayscale.light2};
                border-radius: ${theme.borderRadius}px;
                font-family: ${theme.typography.families.monospace};
                font-size: ${theme.typography.sizes.s}px;
                resize: vertical;
              `}
            />
          </div>
        </StyledPanel>
      </Collapse>
      </fieldset>
      )}
    </Modal>
  );
}
