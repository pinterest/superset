/**
 * Stub for ``PinterestSoftDeletedCell``. In non-plugin builds the
 * soft-deletion concept does not exist, so this is a thin pass-through that
 * renders ``children`` unchanged.
 */
import { ReactNode } from 'react';

type SoftDeletableEntity = {
  deleted_on?: string | null;
  /**
   * Plugin builds read ``rhub_config.rhub_review_id`` from list-row payloads
   * to surface an rHub deletion-review link in the soft-deletion tooltip.
   * In the OSS stub it's just a typed pass-through.
   */
  rhub_config?: { rhub_review_id?: string | null } | null;
};

export type PinterestSoftDeletedCellProps = {
  resource: 'dashboard' | 'chart';
  entity: SoftDeletableEntity;
  variant?: 'name' | 'actions';
  children: ReactNode;
};

const PinterestSoftDeletedCell = ({
  children,
}: PinterestSoftDeletedCellProps) => <>{children}</>;

export default PinterestSoftDeletedCell;
