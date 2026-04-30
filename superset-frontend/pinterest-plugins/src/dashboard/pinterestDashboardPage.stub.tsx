/**
 * Stub for ``PinterestDashboardPage``. In non-plugin builds the soft-deletion
 * concept does not exist, so this is a thin pass-through to the upstream
 * ``DashboardPage`` that preserves the same prop shape.
 */
import { DashboardPage } from 'src/dashboard/containers/DashboardPage';

export type PinterestDashboardPageProps = {
  idOrSlug: string;
};

const PinterestDashboardPage = ({ idOrSlug }: PinterestDashboardPageProps) => (
  <DashboardPage idOrSlug={idOrSlug} />
);

export default PinterestDashboardPage;
