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
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'antd';
import { useTheme } from '@superset-ui/core';
import Icons from 'src/components/Icons';
import getBootstrapData from 'src/utils/getBootstrapData';

interface AnnouncementConfig {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

const STORAGE_KEY_PREFIX = 'superset_announcement_dismissed_';

const getIcon = (type: string) => {
  if (type === 'error') {
    return <Icons.ErrorSolid />;
  }

  if (type === 'warning') {
    return <Icons.AlertSolid />;
  }

  if (type === 'success') {
    return <Icons.CircleCheckSolid />;
  }

  return <Icons.InfoSolid />;
};

const AnnouncementBanner = () => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const theme = useTheme();
  const { gridUnit } = theme;

  // Memoize bootstrap data to prevent re-fetching on every render
  const announcementConfig = useMemo(() => {
    const bootstrapData = getBootstrapData();
    return bootstrapData?.common?.conf?.ANNOUNCEMENTS as
      | AnnouncementConfig[]
      | null;
  }, []);

  useEffect(() => {
    // Load dismissed announcements from localStorage on mount
    if (announcementConfig && Array.isArray(announcementConfig)) {
      const dismissed = new Set<string>();
      announcementConfig.forEach(announcement => {
        if (announcement.id) {
          const storageKey = `${STORAGE_KEY_PREFIX}${announcement.id}`;
          if (localStorage.getItem(storageKey) === 'true') {
            dismissed.add(announcement.id);
          }
        }
      });
      setDismissedIds(dismissed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleClose = useCallback((id: string) => {
    const storageKey = `${STORAGE_KEY_PREFIX}${id}`;
    localStorage.setItem(storageKey, 'true');
    setDismissedIds(prev => new Set([...prev, id]));
  }, []);

  const activeAnnouncements = useMemo(() => {
    if (!announcementConfig || !Array.isArray(announcementConfig)) {
      return [];
    }
    return announcementConfig.filter(
      announcement =>
        announcement.id &&
        announcement.message &&
        !dismissedIds.has(announcement.id),
    );
  }, [announcementConfig, dismissedIds]);

  if (activeAnnouncements.length === 0) {
    return null;
  }

  return (
    <>
      {activeAnnouncements.map(announcement => (
        <Alert
          key={announcement.id}
          banner
          closable
          icon={getIcon(announcement.type)}
          message={
            <div dangerouslySetInnerHTML={{ __html: announcement.message }} />
          }
          onClose={() => handleClose(announcement.id)}
          role="banner"
          showIcon
          style={{ margin: `${gridUnit}px` }}
          type={announcement.type}
        />
      ))}
    </>
  );
};

export default AnnouncementBanner;
