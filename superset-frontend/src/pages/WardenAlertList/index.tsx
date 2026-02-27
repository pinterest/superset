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

import { useState, useMemo, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import rison from 'rison';
import {
  t,
  SupersetClient,
  styled,
  SupersetTheme,
  useTheme,
  getExtensionsRegistry,
} from '@superset-ui/core';
import { extendedDayjs } from 'src/utils/dates';
import ActionsBar, { ActionProps } from 'src/components/ListView/ActionsBar';
import FacePile from 'src/components/FacePile';
import { Tooltip } from 'src/components/Tooltip';
import ListView, {
  FilterOperator,
  Filters,
} from 'src/components/ListView';
import SubMenu from 'src/features/home/SubMenu';
import { Switch } from 'src/components/Switch';
import { DATETIME_WITH_TIME_ZONE } from 'src/constants';
import withToasts from 'src/components/MessageToasts/withToasts';
import Icons from 'src/components/Icons';
import RecipientIcon from 'src/features/alerts/components/RecipientIcon';
import { NotificationMethodOption } from 'src/features/alerts/types';
import DeleteModal from 'src/components/DeleteModal';
import {
  useListViewResource,
  useSingleViewResource,
} from 'src/views/CRUD/hooks';
import { createErrorHandler, createFetchRelated } from 'src/views/CRUD/utils';
import WardenAlertModal from './WardenAlertModal';

const extensionsRegistry = getExtensionsRegistry();

const PAGE_SIZE = 25;

const StyledHeaderWithIcon = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  > *:first-child {
    margin-right: ${({ theme }) => theme.gridUnit}px;
  }
`;

const HeaderExtension = extensionsRegistry.get('alertsreports.header.icon');

// --- Warden execution status display ---

type WardenStatus = 'success' | 'error' | 'triggered';

function getWardenStatusColor(status: string | null, theme: SupersetTheme) {
  switch (status) {
    case 'success':
      return theme.colors.success.base;
    case 'error':
      return theme.colors.error.base;
    case 'triggered':
      return theme.colors.warning.base;
    default:
      return theme.colors.grayscale.base;
  }
}

const WARDEN_STATUS_CONFIG: Record<
  WardenStatus,
  { icon: typeof Icons.Check; label: string }
> = {
  success: { icon: Icons.Check, label: t('Success') },
  error: { icon: Icons.XSmall, label: t('Error') },
  triggered: { icon: Icons.AlertSolidSmall, label: t('Triggered') },
};

function WardenStatusIcon({ state }: { state: string | null }) {
  const theme = useTheme();
  const config = state
    ? WARDEN_STATUS_CONFIG[state as WardenStatus]
    : undefined;
  const Icon = config?.icon ?? Icons.Check;
  const label = config?.label ?? t('Unknown');

  return (
    <Tooltip title={label} placement="bottomLeft">
      <Icon iconColor={getWardenStatusColor(state, theme)} />
    </Tooltip>
  );
}

// --- Types ---

interface WardenAlertOwner {
  first_name: string;
  last_name: string;
  username: string;
}

interface WardenAlertObject {
  id: number;
  owner_id: number;
  owner?: WardenAlertOwner;
  name: string;
  active: boolean;
  run_interval_value: number;
  run_interval_unit: string;
  start_from: string;
  notification_config: {
    email?: string[];
    slack?: string[];
  };
  last_executed_at: string | null;
  last_execution_status: string | null;
  created_on: string;
  changed_on: string;
}

interface WardenAlertListProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  user: {
    userId: string | number;
    firstName: string;
    lastName: string;
    username: string;
  };
}

function formatSchedule(value: number, unit: string): string {
  const plural = value === 1 ? '' : 's';
  return `Every ${value} ${unit}${plural}`;
}

function WardenAlertList({
  addDangerToast,
  addSuccessToast,
  user,
}: WardenAlertListProps) {
  const location = useLocation();
  const history = useHistory();

  // Pre-populate Owner filter on first load if no filters in URL
  const needsRedirect =
    !location.search.includes('filters') &&
    !location.search.includes('pageIndex');

  if (needsRedirect) {
    const filterObj = {
      owner_id: {
        label: `${user.firstName} ${user.lastName}`,
        value: user.userId,
      },
    };
    history.replace(
      `/wardenalert/list/?filters=${rison.encode_uri(filterObj)}`,
    );
  }

  const {
    state: {
      loading,
      resourceCount: alertsCount,
      resourceCollection: alerts,
    },
    fetchData,
    setResourceCollection,
    refreshData,
  } = useListViewResource<WardenAlertObject>(
    'warden/alerts',
    t('warden alert'),
    addDangerToast,
    false,
  );

  const { updateResource } = useSingleViewResource<Partial<WardenAlertObject>>(
    'warden/alerts',
    t('warden alert'),
    addDangerToast,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<WardenAlertObject | null>(
    null,
  );
  const [currentAlertDeleting, setCurrentAlertDeleting] =
    useState<WardenAlertObject | null>(null);

  function handleAlertView(alert: WardenAlertObject) {
    setCurrentAlert(alert);
    setModalOpen(true);
  }

  const handleAlertDelete = ({ id, name }: WardenAlertObject) => {
    SupersetClient.delete({
      endpoint: `/api/v1/warden/alerts/${id}`,
    }).then(
      () => {
        refreshData();
        setCurrentAlertDeleting(null);
        addSuccessToast(t('Deleted: %s', name));
      },
      createErrorHandler(errMsg =>
        addDangerToast(t('There was an issue deleting %s: %s', name, errMsg)),
      ),
    );
  };

  const toggleActive = useCallback(
    (data: WardenAlertObject, checked: boolean) => {
      if (data?.id) {
        const updateId = data.id;
        const original = [...alerts];

        setResourceCollection(
          original.map(alert =>
            alert?.id === data.id ? { ...alert, active: checked } : alert,
          ),
        );

        updateResource(updateId, { active: checked } as any, false, false)
          .then()
          .catch(() => setResourceCollection(original));
      }
    },
    [alerts, setResourceCollection, updateResource],
  );

  const initialSort = [{ id: 'name', desc: true }];

  const columns = useMemo(
    () => [
      {
        Cell: ({
          row: {
            original: { last_execution_status: status },
          },
        }: any) => <WardenStatusIcon state={status} />,
        accessor: 'last_execution_status',
        size: 'xs',
        disableSortBy: true,
      },
      {
        Cell: ({
          row: {
            original: { last_executed_at: lastExecutedAt },
          },
        }: any) =>
          lastExecutedAt
            ? extendedDayjs
                .utc(lastExecutedAt)
                .local()
                .format(DATETIME_WITH_TIME_ZONE)
            : '',
        accessor: 'last_executed_at',
        Header: t('Last run'),
        size: 'lg',
      },
      {
        accessor: 'name',
        Header: t('Name'),
        size: 'xl',
      },
      {
        Header: t('Schedule'),
        accessor: 'run_interval_value',
        size: 'xl',
        disableSortBy: true,
        Cell: ({
          row: {
            original: { run_interval_value: value, run_interval_unit: unit },
          },
        }: any) => (
          <Tooltip
            title={formatSchedule(value, unit)}
            placement="topLeft"
          >
            <span>{formatSchedule(value, unit)}</span>
          </Tooltip>
        ),
      },
      {
        Cell: ({
          row: {
            original: { notification_config: config },
          },
        }: any) => {
          const icons = [];
          if (config?.email?.length) {
            icons.push(
              <RecipientIcon
                key="email"
                type={NotificationMethodOption.Email}
              />,
            );
          }
          if (config?.slack?.length) {
            icons.push(
              <RecipientIcon
                key="slack"
                type={NotificationMethodOption.Slack}
              />,
            );
          }
          return <>{icons}</>;
        },
        accessor: 'notification_config',
        Header: t('Notification method'),
        disableSortBy: true,
        size: 'xl',
      },
      {
        Cell: ({
          row: {
            original: { owner_id: ownerId, owner },
          },
        }: any) => (
          <FacePile
            users={
              owner
                ? [
                    {
                      id: ownerId,
                      first_name: owner.first_name,
                      last_name: owner.last_name,
                      username: owner.username,
                    },
                  ]
                : []
            }
          />
        ),
        Header: t('Owner'),
        id: 'owner',
        disableSortBy: true,
        size: 'xl',
      },
      {
        Cell: ({ row: { original } }: any) => {
          const isOwner =
            Number(original.owner_id) === Number(user.userId);

          return (
            <Switch
              disabled={!isOwner}
              data-test="toggle-active"
              checked={original.active}
              onClick={(checked: boolean) => toggleActive(original, checked)}
              size="small"
            />
          );
        },
        Header: t('Active'),
        accessor: 'active',
        id: 'active',
        size: 'xl',
      },
      {
        Cell: ({ row: { original } }: any) => {
          const isOwner =
            Number(original.owner_id) === Number(user.userId);
          const handleView = () => handleAlertView(original);
          const handleDelete = () => setCurrentAlertDeleting(original);

          const actions = [
            {
              label: 'view-action',
              tooltip: isOwner ? t('View/Modify') : t('View'),
              placement: 'bottom',
              icon: 'Edit',
              onClick: handleView,
            },
            isOwner
              ? {
                  label: 'delete-action',
                  tooltip: t('Delete'),
                  placement: 'bottom',
                  icon: 'Trash',
                  onClick: handleDelete,
                }
              : null,
          ].filter(item => item !== null);

          return <ActionsBar actions={actions as ActionProps[]} />;
        },
        Header: t('Actions'),
        id: 'actions',
        disableSortBy: true,
        size: 'xl',
      },
      {
        accessor: 'owner_id',
        hidden: true,
      },
    ],
    [toggleActive, user.userId],
  );

  const filters: Filters = useMemo(
    () => [
      {
        Header: t('Name'),
        key: 'search',
        id: 'name',
        input: 'search',
        operator: FilterOperator.Contains,
      },
      {
        Header: t('Owner'),
        key: 'owner',
        id: 'owner_id',
        input: 'select',
        operator: FilterOperator.Equals,
        unfilteredLabel: t('All'),
        fetchSelects: createFetchRelated(
          'report',
          'owners',
          createErrorHandler(errMsg =>
            t('An error occurred while fetching owners values: %s', errMsg),
          ),
          user,
        ),
        paginate: true,
      },
    ],
    [user],
  );

  const emptyState = {
    title: t('No warden alerts yet'),
    image: 'filter-results.svg',
  };

  const header = HeaderExtension ? (
    <StyledHeaderWithIcon>
      <div>{t('Alerts & reports')}</div>
      <HeaderExtension />
    </StyledHeaderWithIcon>
  ) : (
    t('Alerts & reports')
  );

  return (
    <>
      <SubMenu
        activeChild="Warden Alerts"
        name={header}
        tabs={[
          {
            name: 'Alerts',
            label: t('Alerts'),
            url: '/alert/list/',
            usesRouter: true,
            'data-test': 'alert-list',
          },
          {
            name: 'Reports',
            label: t('Reports'),
            url: '/report/list/',
            usesRouter: true,
            'data-test': 'report-list',
          },
          {
            name: 'Warden Alerts',
            label: t('Warden Alerts'),
            url: '/wardenalert/list/',
            usesRouter: true,
            'data-test': 'warden-alert-list',
          },
        ]}
      />
      <WardenAlertModal
        alert={currentAlert}
        show={modalOpen}
        onHide={() => {
          setModalOpen(false);
          setCurrentAlert(null);
        }}
      />
      {currentAlertDeleting && (
        <DeleteModal
          description={t(
            'This action will permanently delete %s.',
            currentAlertDeleting.name,
          )}
          onConfirm={() => {
            if (currentAlertDeleting) {
              handleAlertDelete(currentAlertDeleting);
            }
          }}
          onHide={() => setCurrentAlertDeleting(null)}
          open
          title={t('Delete %s?', currentAlertDeleting.name)}
        />
      )}
      <ListView<WardenAlertObject>
        className="warden-alerts-list-view"
        columns={columns}
        count={alertsCount}
        data={alerts}
        emptyState={emptyState}
        fetchData={fetchData}
        filters={filters}
        initialSort={initialSort}
        loading={loading}
        bulkActions={[]}
        bulkSelectEnabled={false}
        refreshData={refreshData}
        addDangerToast={addDangerToast}
        addSuccessToast={addSuccessToast}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}

export default withToasts(WardenAlertList);
