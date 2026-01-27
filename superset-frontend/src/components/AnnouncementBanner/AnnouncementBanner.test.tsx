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
import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, supersetTheme } from '@superset-ui/core';
import { MemoryRouter } from 'react-router-dom';
import getBootstrapData from 'src/utils/getBootstrapData';
import AnnouncementBanner from '.';

// Mock getBootstrapData
jest.mock('src/utils/getBootstrapData', () => ({
  __esModule: true,
  // Provide a safe default shape because some modules (e.g. `hostNamesConfig`)
  // read bootstrap data at import-time, before individual tests set mockReturnValue.
  default: jest.fn(() => ({
    common: {
      conf: {},
      feature_flags: {},
    },
  })),
}));

const renderWithTheme = (component: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider theme={supersetTheme}>{component}</ThemeProvider>
    </MemoryRouter>,
  );

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should not render when no announcement config is provided', () => {
    (getBootstrapData as jest.Mock).mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: null,
        },
      },
    });

    const { container } = renderWithTheme(<AnnouncementBanner />);

    // eslint-disable-next-line jest-dom/prefer-empty
    expect(container.firstChild).toBeNull();
  });

  it('should render when announcement config is provided', () => {
    (getBootstrapData as jest.Mock).mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: [
            {
              id: 'test-announcement',
              message: '<strong>Test</strong> message',
              type: 'info',
            },
          ],
        },
      },
    });

    renderWithTheme(<AnnouncementBanner />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('should render HTML content correctly', () => {
    (getBootstrapData as jest.Mock).mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: [
            {
              id: 'test-announcement',
              message: '<strong>Bold text</strong> and normal text',
              type: 'info',
            },
          ],
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

    (getBootstrapData as jest.Mock).mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: [
            {
              id: announcementId,
              message: 'This should not appear',
              type: 'info',
            },
          ],
        },
      },
    });

    const { container } = renderWithTheme(<AnnouncementBanner />);

    // eslint-disable-next-line jest-dom/prefer-empty
    expect(container.firstChild).toBeNull();
  });

  it('should dismiss announcement and save to localStorage when close button is clicked', async () => {
    const announcementId = 'test-announcement';
    (getBootstrapData as jest.Mock).mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: [
            {
              id: announcementId,
              message: 'Test message',
              type: 'info',
            },
          ],
        },
      },
    });

    renderWithTheme(<AnnouncementBanner />);

    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(
        localStorage.getItem(
          `superset_announcement_dismissed_${announcementId}`,
        ),
      ).toBe('true');
    });
  });

  it('should render different alert types correctly', () => {
    const types = ['info', 'warning', 'error', 'success'] as const;

    types.forEach(type => {
      (getBootstrapData as jest.Mock).mockReturnValue({
        common: {
          conf: {
            ANNOUNCEMENTS: [
              {
                id: `test-${type}`,
                message: `Test ${type} message`,
                type,
              },
            ],
          },
        },
      });

      const { unmount } = renderWithTheme(<AnnouncementBanner />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
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
    (getBootstrapData as jest.Mock).mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: [
            {
              id: secondId,
              message: 'New announcement',
              type: 'info',
            },
          ],
        },
      },
    });

    renderWithTheme(<AnnouncementBanner />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText(/New announcement/)).toBeInTheDocument();
  });

  it('should render multiple announcements at once', () => {
    (getBootstrapData as jest.Mock).mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: [
            {
              id: 'announcement-1',
              message: 'First announcement',
              type: 'info',
            },
            {
              id: 'announcement-2',
              message: 'Second announcement',
              type: 'warning',
            },
            {
              id: 'announcement-3',
              message: 'Third announcement',
              type: 'success',
            },
          ],
        },
      },
    });

    renderWithTheme(<AnnouncementBanner />);
    const banners = screen.getAllByRole('banner');
    expect(banners).toHaveLength(3);
    expect(screen.getByText(/First announcement/)).toBeInTheDocument();
    expect(screen.getByText(/Second announcement/)).toBeInTheDocument();
    expect(screen.getByText(/Third announcement/)).toBeInTheDocument();
  });

  it('should only render non-dismissed announcements when multiple exist', () => {
    // Dismiss the second announcement
    localStorage.setItem(
      'superset_announcement_dismissed_announcement-2',
      'true',
    );

    (getBootstrapData as jest.Mock).mockReturnValue({
      common: {
        conf: {
          ANNOUNCEMENTS: [
            {
              id: 'announcement-1',
              message: 'First announcement',
              type: 'info',
            },
            {
              id: 'announcement-2',
              message: 'Second announcement (dismissed)',
              type: 'warning',
            },
            {
              id: 'announcement-3',
              message: 'Third announcement',
              type: 'success',
            },
          ],
        },
      },
    });

    renderWithTheme(<AnnouncementBanner />);
    const banners = screen.getAllByRole('banner');
    expect(banners).toHaveLength(2);
    expect(screen.getByText(/First announcement/)).toBeInTheDocument();
    expect(screen.queryByText(/Second announcement/)).not.toBeInTheDocument();
    expect(screen.getByText(/Third announcement/)).toBeInTheDocument();
  });
});
