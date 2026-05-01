/**
 * Stub for ``PinterestSoftDeletedCardOverlay``. In non-plugin builds the
 * soft-deletion concept does not exist, so this is a thin pass-through that
 * renders ``children`` unchanged.
 */
import { ReactNode } from 'react';

export type PinterestSoftDeletedCardOverlayProps = {
  resource: 'dashboard' | 'chart';
  owners?: unknown[];
  dataTest?: string;
  children: ReactNode;
};

const PinterestSoftDeletedCardOverlay = ({
  children,
}: PinterestSoftDeletedCardOverlayProps) => <>{children}</>;

export default PinterestSoftDeletedCardOverlay;
