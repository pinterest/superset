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
import { render } from 'spec/helpers/testing-library';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/react';

import SyncChartOwnersControl, {
  SyncChartOwnersControlProps,
} from 'src/dashboard/components/PropertiesModal/SyncChartOwnersControl';

const props: SyncChartOwnersControlProps = {
  autoSyncChartsEnabled: true,
  onChange: jest.fn(),
  dashboardOwnerIds: [1, 2, 3],
  chartInfoMap: {
    1: { id: 1, name: 'Chart 1', ownerIds: [1] },
    2: { id: 2, name: 'Chart 2', ownerIds: [2] },
    3: { id: 3, name: 'Chart 3', ownerIds: [3] },
    4: { id: 4, name: 'Chart 4', ownerIds: [4] },
    5: { id: 5, name: 'Chart 5', ownerIds: [5] },
  },
};

const setup = (overrides?: any) => (
  <SyncChartOwnersControl {...props} {...overrides} />
);

describe('SyncChartOwnersControl', () => {
  it('renders a checkbox', async () => {
    const rendered = render(setup());

    const checkbox = await within(
      rendered.getByTestId('sync-chart-owners-control'),
    ).findByRole('checkbox');
    const label = rendered.getByText('Add dashboard owners to all charts.');

    expect(checkbox).toBeInTheDocument();
    expect(label).toBeInTheDocument();
  });

  it('calls onChange when checkbox is clicked', async () => {
    const onChange = jest.fn();
    const rendered = render(setup({ autoSyncChartsEnabled: false, onChange }));

    const checkbox = await within(
      rendered.getByTestId('sync-chart-owners-control'),
    ).findByRole('checkbox');
    await userEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows a tooltip for unsupported charts', async () => {
    const rendered = render(setup());

    const tooltip = await rendered.findByLabelText(
      'You do not have permission to update the following charts: Chart 4, Chart 5',
      { selector: 'span' },
    );
    expect(tooltip).toBeInTheDocument();
  });

  it('truncates unsupported chart list to 1 singular', async () => {
    const rendered = render(setup({ dashboardOwnerIds: [1] }));

    const tooltip = await rendered.findByLabelText(
      'You do not have permission to update the following charts: Chart 2, Chart 3, Chart 4, and 1 other',
      { selector: 'span' },
    );
    expect(tooltip).toBeInTheDocument();
  });

  it('truncates unsupported chart list to 2 plural', async () => {
    const rendered = render(setup({ dashboardOwnerIds: [] }));

    const tooltip = await rendered.findByLabelText(
      'You do not have permission to update the following charts: Chart 1, Chart 2, Chart 3, and 2 others',
      { selector: 'span' },
    );
    expect(tooltip).toBeInTheDocument();
  });

  it('does not show tooltip when there are no unsupported charts', () => {
    const rendered = render(
      setup({
        dashboardOwnerIds: [1, 2, 3, 4, 5],
      }),
    );

    const tooltip = rendered.queryByLabelText(
      'You do not have permission to update the following charts:',
      { selector: 'span' },
    );
    expect(tooltip).not.toBeInTheDocument();
  });

  it('does not show tooltip when autoSyncChartsEnabled is false', () => {
    const rendered = render(setup({ autoSyncChartsEnabled: false }));

    const tooltip = rendered.queryByLabelText(
      'You do not have permission to update the following charts:',
      { selector: 'span' },
    );
    expect(tooltip).not.toBeInTheDocument();
  });
});
