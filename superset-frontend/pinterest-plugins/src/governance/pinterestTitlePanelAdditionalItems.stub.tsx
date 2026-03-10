import { ReactNode } from 'react';

type PinterestTitlePanelAdditionalItemsProps = {
  dashboardId: number;
};

/**
 * Stub for Pinterest title panel additional items (e.g. governance tags).
 * Replaced by the real component when USE_PINTEREST_PLUGINS=true.
 */
const PinterestTitlePanelAdditionalItems = (
  _props: PinterestTitlePanelAdditionalItemsProps,
): ReactNode => null;

export default PinterestTitlePanelAdditionalItems;
