import { ReactNode } from 'react';

type DashboardOwner = {
  id?: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type PinterestDashboardBannersProps = {
  dashboardId: number;
  onEditTier: () => void;
  isDashboardOwner: boolean;
  owners?: DashboardOwner[];
};

/**
 * Stub for Pinterest dashboard banners (e.g. Tier 3 warning, pending-review).
 * Replaced by the real component when USE_PINTEREST_PLUGINS=true.
 */
const PinterestDashboardBanners = (
  _props: PinterestDashboardBannersProps,
): ReactNode => null;

export default PinterestDashboardBanners;
