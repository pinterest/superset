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
import { CHART_LIST } from 'cypress/utils/urls';
import { setGridMode, clearAllInputs } from 'cypress/utils';
import { interceptFiltering, setFilter } from '../explore/utils';

const DROPDOWN_SELECTOR = '.ant-select-dropdown, .antd5-select-dropdown, .Select__menu';
const OPTION_SELECTOR =
  '.ant-select-item-option, .antd5-select-item-option, .Select__option';

function getFilterControl(filterLabel: string) {
  // Prefer the stable data-test selector used across list pages.
  return cy.get('body').then($body => {
    const preferred = $body.find(
      `[data-test="filters-select"][aria-label="${filterLabel}"]`,
    );
    if (preferred.length) {
      return cy.wrap(preferred.first());
    }

    const fallback = $body.find(`[aria-label="${filterLabel}"]`);
    if (fallback.length) {
      return cy.wrap(fallback.first());
    }

    cy.task('log', {
      context: `${filterLabel}:controlNotFound`,
      foundAriaLabels: Array.from(
        $body.find('[aria-label]').slice(0, 50),
      ).map(el => (el as HTMLElement).getAttribute('aria-label')),
    });
    throw new Error(`Could not find filter control for aria-label="${filterLabel}"`);
  });
}

function logOpenAntdDropdownOptions(context: string) {
  cy.get(DROPDOWN_SELECTOR)
    .filter(':visible')
    .should('have.length.greaterThan', 0)
    .first()
    .then($dropdown => {
      const options = Array.from(
        $dropdown[0].querySelectorAll<HTMLElement>(OPTION_SELECTOR),
      ).map(el => ({
        title: el.getAttribute('title'),
        text: (el.textContent || '').trim(),
      }));

      cy.task('log', {
        context,
        dropdownClass: $dropdown[0].className,
        optionCount: options.length,
        options,
      });
    });
}

function openFilterAndLogOptions(filterLabel: string, search?: string) {
  getFilterControl(filterLabel).click({ force: true });
  logOpenAntdDropdownOptions(`${filterLabel}:initial`);
  if (search) {
    getFilterControl(filterLabel).then($el => {
      const $select = $el.closest('.ant-select, .antd5-select');
      if ($select.length) {
        cy.wrap($select)
          .find(
            'input.ant-select-selection-search-input, input.antd5-select-selection-search-input',
          )
          .filter(':visible')
          .first()
          .clear({ force: true })
          .type(search, { force: true });
      } else {
        cy.focused().clear({ force: true }).type(search, { force: true });
      }
    });
    logOpenAntdDropdownOptions(`${filterLabel}:afterSearch(${search})`);
  }
}

describe('Charts filters', () => {
  before(() => {
    cy.visit(CHART_LIST);
    setGridMode('card');
  });

  beforeEach(() => {
    clearAllInputs();
  });

  it('should allow filtering by "Owner"', () => {
    // Debug: log what the dropdown actually contains in CI/local env
    openFilterAndLogOptions('Owner', 'admin');

    // Keep existing behavior (so we can compare logs vs. failures)
    interceptFiltering();
    getFilterControl('Owner').click({ force: true });
    logOpenAntdDropdownOptions('Owner:beforeSelect(admin user (admin))');
    cy.get(`[aria-label="Owner"] [title="admin user (admin)"]`).click({
      force: true,
    });
    cy.wait('@filtering');
  });

  it('should allow filtering by "Modified by" correctly', () => {
    // Debug: log what the dropdown actually contains in CI/local env
    openFilterAndLogOptions('Modified by', 'admin');

    // Keep existing behavior (so we can compare logs vs. failures)
    interceptFiltering();
    getFilterControl('Modified by').click({ force: true });
    logOpenAntdDropdownOptions('Modified by:beforeSelect(admin user (admin))');
    cy.get(`[aria-label="Modified by"] [title="admin user (admin)"]`).click({
      force: true,
    });
    cy.wait('@filtering');
  });

  it('should allow filtering by "Type" correctly', () => {
    setFilter('Type', 'Area Chart');
    setFilter('Type', 'Bubble Chart');
  });

  it('should allow filtering by "Dataset" correctly', () => {
    setFilter('Dataset', 'energy_usage');
    setFilter('Dataset', 'unicode_test');
  });

  it('should allow filtering by "Dashboards" correctly', () => {
    setFilter('Dashboard', 'Unicode Test');
    setFilter('Dashboard', 'Tabbed Dashboard');
  });
});
