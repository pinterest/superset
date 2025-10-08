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

/* eslint-disable */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, supersetTheme } from '@superset-ui/core';
import AnnouncementBanner from '.';

// Mock getBootstrapData
jest.mock('src/utils/getBootstrapData', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const getBootstrapData = require('src/utils/getBootstrapData').default;

const renderWithTheme = (component: React.ReactElement) =>
  render(<ThemeProvider theme={supersetTheme}>{component}</ThemeProvider>);

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should not render when no announcement config is provided', () => {
    getBootstrapData.mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: null,
        },
      },
    });

    const { container } = renderWithTheme(<AnnouncementBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when announcement config is provided', () => {
    getBootstrapData.mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: {
            id: 'test-announcement',
            message: '<strong>Test</strong> message',
            type: 'info',
          },
        },
      },
    });

    renderWithTheme(<AnnouncementBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render HTML content correctly', () => {
    getBootstrapData.mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: {
            id: 'test-announcement',
            message: '<strong>Bold text</strong> and normal text',
            type: 'info',
          },
        },
      },
    });

    renderWithTheme(<AnnouncementBanner />);
    expect(screen.getByText(/Bold text/)).toBeInTheDocument();
    expect(screen.getByText(/normal text/)).toBeInTheDocument();
  });

  it('should not render when announcement has been dismissed', () => {
    const announcementId = 'dismissed-announcement';
    localStorage.setItem(
      `superset_announcement_dismissed_${announcementId}`,
      'true',
    );

    getBootstrapData.mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: {
            id: announcementId,
            message: 'This should not appear',
            type: 'info',
          },
        },
      },
    });

    const { container } = renderWithTheme(<AnnouncementBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should dismiss announcement and save to localStorage when close button is clicked', async () => {
    const announcementId = 'test-announcement';
    getBootstrapData.mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: {
            id: announcementId,
            message: 'Test message',
            type: 'info',
          },
        },
      },
    });

    renderWithTheme(<AnnouncementBanner />);
    
    const closeButton = screen.getByLabelText('Close announcement');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(
        localStorage.getItem(`superset_announcement_dismissed_${announcementId}`),
      ).toBe('true');
    });
  });

  it('should render different alert types correctly', () => {
    const types = ['info', 'warning', 'error', 'success'] as const;

    types.forEach(type => {
      getBootstrapData.mockReturnValue({
        common: {
          conf: {
            ANNOUNCEMENTS: {
              id: `test-${type}`,
              message: `Test ${type} message`,
              type,
            },
          },
        },
      });

      const { unmount } = renderWithTheme(<AnnouncementBanner />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      unmount();
      localStorage.clear();
    });
  });

  it('should show new announcement when ID changes after dismissal', () => {
    const firstId = 'announcement-1';
    const secondId = 'announcement-2';

    // Dismiss first announcement
    localStorage.setItem(`superset_announcement_dismissed_${firstId}`, 'true');

    // Show second announcement with different ID
    getBootstrapData.mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: {
            id: secondId,
            message: 'New announcement',
            type: 'info',
          },
        },
      },
    });

    renderWithTheme(<AnnouncementBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/New announcement/)).toBeInTheDocument();
  });
});

