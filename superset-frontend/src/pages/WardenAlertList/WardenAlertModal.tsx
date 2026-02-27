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
import { t } from '@superset-ui/core';
import Modal from 'src/components/Modal';

interface WardenAlertModalProps {
  alert: { id: number; name?: string } | null;
  show: boolean;
  onHide: () => void;
}

export default function WardenAlertModal({
  alert,
  show,
  onHide,
}: WardenAlertModalProps) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      title={alert ? t('Warden Alert: %s', alert.name ?? alert.id) : t('Warden Alert')}
      hideFooter
    >
      <p>{t('Warden alert detail view — coming soon.')}</p>
    </Modal>
  );
}
