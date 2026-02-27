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
import { DatePicker } from 'src/components/DatePicker';
import Icons from 'src/components/Icons';
import Modal from 'src/components/Modal';
import Collapse from 'src/components/Collapse';
import TimezoneSelector from 'src/components/TimezoneSelector';
import StyledPanel from 'src/features/alerts/components/StyledPanel';
import { extendedDayjs } from 'src/utils/dates';
import Loading from 'src/components/Loading';
import { JsonEditor } from 'src/components/AsyncAceEditor';

interface EditWardenAlertModalProps {
  alertId: number | null;
  show: boolean;
  onHide: () => void;
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  onSaveSuccess?: () => void;
}

export default function EditWardenAlertModal({
  alertId,
  show,
  onHide,
  addDangerToast,
  addSuccessToast,
  onSaveSuccess,
}: EditWardenAlertModalProps) {
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [alertName, setAlertName] = useState('');
  const [runIntervalValue, setRunIntervalValue] = useState<number | ''>('');
  const [runIntervalUnit, setRunIntervalUnit] = useState('day');
  const [startFrom, setStartFrom] = useState<any>(null);
  const [timezone, setTimezone] = useState<string>('America/Los_Angeles');
  const [slackChannel, setSlackChannel] = useState('');
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
        setRunIntervalValue(data.run_interval_value ?? '');
        setRunIntervalUnit(data.run_interval_unit ?? 'day');
        setStartFrom(
          data.start_from ? extendedDayjs(data.start_from) : null,
        );
        const notifConfig = data.notification_config ?? {};
        setSlackChannel(
          (notifConfig.slack_channels ?? notifConfig.slack ?? []).join(', '),
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
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  const emailsValid =
    !emailRecipients || parsedEmails.every((e: string) => emailRegex.test(e));

  const parsedSlackChannels = slackChannel
    ? slackChannel
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  const slackValid = !slackChannel || parsedSlackChannels.length > 0;

  const notificationValid =
    !!(slackChannel || emailRecipients) && emailsValid && slackValid;

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
    !!startFrom &&
    !!timezone &&
    !!querySql.trim() &&
    postProcessingValid &&
    notificationValid;

  const handleSave = async () => {
    if (!isFormValid || alertId == null) return;

    const wallClock = startFrom.startOf('hour').format('YYYY-MM-DD HH:mm');
    const startInTz = extendedDayjs.tz(wallClock, timezone);

    try {
      await SupersetClient.put({
        endpoint: `/api/v1/warden/alerts/${alertId}`,
        jsonPayload: {
          name: alertName,
          active: true,
          run_interval_value: runIntervalValue,
          run_interval_unit: runIntervalUnit,
          start_from: startInTz.toISOString(),
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
            slack_channels: parsedSlackChannels,
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
      title={<h4>{t('Edit Warden Alert')}</h4>}
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
          <Button
            buttonStyle="primary"
            onClick={handleSave}
            disabled={!isFormValid}
            cta
          >
            {t('Save')}
          </Button>
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
                css={css`
                  width: 140px;
                `}
              />
            </div>
            <div
              css={css`
                display: flex;
                align-items: center;
                gap: ${theme.gridUnit * 2}px;
                margin-top: ${theme.gridUnit * 2}px;
              `}
            >
              <span css={css`white-space: nowrap;`}>{t('Starting')}</span>
              <DatePicker
                showTime={{ format: 'HH:00' }}
                format="YYYY-MM-DD HH:00"
                value={startFrom}
                onChange={val => {
                  const nowInTz = new Date(
                    new Date().toLocaleString('en-US', { timeZone: timezone }),
                  );
                  if (val && val.valueOf() < nowInTz.getTime()) {
                    setStartFrom(null);
                  } else {
                    setStartFrom(val);
                  }
                }}
                placeholder={t('Select date and time')}
                disabledDate={(current: any) => {
                  const nowInTz = new Date(
                    new Date().toLocaleString('en-US', { timeZone: timezone }),
                  );
                  const startOfDay = new Date(nowInTz);
                  startOfDay.setHours(0, 0, 0, 0);
                  return current && current < startOfDay;
                }}
                disabledTime={(current: any) => {
                  const nowInTz = new Date(
                    new Date().toLocaleString('en-US', { timeZone: timezone }),
                  );
                  if (
                    current &&
                    current.format('YYYY-MM-DD') ===
                      `${nowInTz.getFullYear()}-${String(nowInTz.getMonth() + 1).padStart(2, '0')}-${String(nowInTz.getDate()).padStart(2, '0')}`
                  ) {
                    return {
                      disabledHours: () =>
                        Array.from(
                          { length: nowInTz.getHours() + 1 },
                          (_, i) => i,
                        ),
                    };
                  }
                  return {};
                }}
                css={css`
                  min-width: 200px;
                `}
              />
              <TimezoneSelector
                onTimezoneChange={(val: string) => {
                  setTimezone(val);
                  if (startFrom) {
                    const nowInNewTz = new Date(
                      new Date().toLocaleString('en-US', { timeZone: val }),
                    );
                    if (startFrom.valueOf() < nowInNewTz.getTime()) {
                      setStartFrom(null);
                    }
                  }
                }}
                timezone={timezone}
                minWidth="220px"
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
                onChange={e => setDetrend(e.target.checked)}
              >
                {t('Remove trend from data first')}
              </AntdCheckbox>
              <AntdCheckbox
                checked={yearlySeasonality}
                onChange={e => setYearlySeasonality(e.target.checked)}
              >
                {t('Yearly seasonality')}
              </AntdCheckbox>
              <AntdCheckbox
                checked={monthlySeasonality}
                onChange={e => setMonthlySeasonality(e.target.checked)}
              >
                {t('Monthly seasonality')}
              </AntdCheckbox>
              <AntdCheckbox
                checked={weeklySeasonality}
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
                    color: ${theme.colors.grayscale.base};
                    cursor: pointer;
                  `}
                />
              </Tooltip>
              <span className="required">*</span>
            </div>
            <div className="input-container">
              <span css={css`white-space: nowrap; width: 50px;`}>
                {t('Slack')}
              </span>
              <input
                type="text"
                value={slackChannel}
                placeholder={t("Enter Slack channels, separated by ','")}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSlackChannel(e.target.value)
                }
              />
            </div>
            {!slackValid && (
              <div
                css={css`
                  color: ${theme.colors.error.base};
                  font-size: ${theme.typography.sizes.s}px;
                  margin-top: ${theme.gridUnit}px;
                `}
              >
                {t(
                  'Invalid Slack channel. Please correct or clear the field, but make sure at least one notification method (Slack or email) is provided.',
                )}
              </div>
            )}
            <div className="input-container">
              <span css={css`white-space: nowrap; width: 50px;`}>
                {t('Email')}
              </span>
              <input
                type="text"
                value={emailRecipients}
                placeholder={t("Enter email recipients, separated by ','")}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmailRecipients(e.target.value)
                }
              />
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
      )}
    </Modal>
  );
}
