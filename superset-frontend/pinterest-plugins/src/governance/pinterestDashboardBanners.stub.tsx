import { ReactNode } from 'react';

type PinterestDashboardBannersProps = {
  dashboardId: number;
  onEditTier: () => void;
  isDashboardOwner: boolean;
};

/**
 * Stub for Pinterest dashboard banners (e.g. Tier 3 warning).
 * Replaced by the real component when USE_PINTEREST_PLUGINS=true.
 */
const PinterestDashboardBanners = (
  _props: PinterestDashboardBannersProps,
): ReactNode => null;

export default PinterestDashboardBanners;
