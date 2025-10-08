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

import { StoryFn, Meta } from '@storybook/react';
import { Alert } from 'antd';
import { styled, SupersetTheme } from '@superset-ui/core';
import Icons from 'src/components/Icons';

// We'll create a standalone version of the component for Storybook
// to avoid mocking getBootstrapData

interface AnnouncementConfig {
  id: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

const StyledAlert = styled(Alert)`
  ${({ theme }: { theme: SupersetTheme }) => `
    border: 0;
    border-radius: 0;
    margin: 0;
    padding: ${theme.gridUnit * 3}px ${theme.gridUnit * 6}px;
    
    .ant-alert-icon {
      margin-right: ${theme.gridUnit * 2}px;
    }
    
    .ant-alert-message {
      font-size: ${theme.typography.sizes.m}px;
      line-height: 1.5;
      
      strong {
        font-weight: ${theme.typography.weights.bold};
      }
    }
    
    .ant-alert-close-icon {
      font-size: ${theme.typography.sizes.l}px;
      
      svg {
        width: ${theme.gridUnit * 4}px;
        height: ${theme.gridUnit * 4}px;
      }
    }
  `}
`;

function AnnouncementBannerStory({ config }: { config: AnnouncementConfig }) {
  const { type = 'info', message } = config;

  let icon;
  if (type === 'error') {
    icon = <Icons.ErrorSolid />;
  } else if (type === 'warning') {
    icon = <Icons.AlertSolid />;
  } else if (type === 'success') {
    icon = <Icons.CircleCheckSolid />;
  } else {
    icon = <Icons.InfoSolid />;
  }

  return (
    <StyledAlert
      type={type}
      message={<div dangerouslySetInnerHTML={{ __html: message }} />}
      icon={icon}
      closable
      // closeIcon={<Icons.XSmall aria-label="Close announcement" />}
      onClose={() => console.log('Banner dismissed')}
      showIcon
      banner
    />
  );
}

export default {
  title: 'AnnouncementBanner',
  component: AnnouncementBannerStory,
} as Meta<typeof AnnouncementBannerStory>;

const Template: StoryFn<typeof AnnouncementBannerStory> = args => (
  <AnnouncementBannerStory {...args} />
);

export const InfoBanner = Template.bind({});
InfoBanner.args = {
  config: {
    id: 'info-example',
    message:
      '<strong>New Features Available!</strong> Check out our latest updates in the documentation.',
    type: 'info',
  },
};

export const WarningBanner = Template.bind({});
WarningBanner.args = {
  config: {
    id: 'warning-example',
    message:
      '<strong>Scheduled Maintenance:</strong> System will be unavailable on October 15th from 2:00-4:00 AM UTC.',
    type: 'warning',
  },
};

export const ErrorBanner = Template.bind({});
ErrorBanner.args = {
  config: {
    id: 'error-example',
    message:
      '<strong>Action Required:</strong> Please update your password by October 30th. <a href="#">Update now</a>',
    type: 'error',
  },
};

export const SuccessBanner = Template.bind({});
SuccessBanner.args = {
  config: {
    id: 'success-example',
    message:
      '✨ <strong>Migration Complete!</strong> All dashboards have been successfully migrated to the new platform.',
    type: 'success',
  },
};

export const WithLink = Template.bind({});
WithLink.args = {
  config: {
    id: 'link-example',
    message:
      'Read our <a href="https://superset.apache.org/docs" target="_blank" rel="noopener noreferrer">documentation</a> to learn about new features.',
    type: 'info',
  },
};

export const WithList = Template.bind({});
WithList.args = {
  config: {
    id: 'list-example',
    message:
      '<strong>Important Updates:</strong><ul style="margin: 8px 0 0 0; padding-left: 20px;"><li>New chart types available</li><li>Improved performance</li><li>Bug fixes and security updates</li></ul>',
    type: 'info',
  },
};

