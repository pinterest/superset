/**
 * Stub for ``PinterestExploreViewContainer``. In non-plugin builds the
 * soft-deletion concept does not exist, so this is a thin pass-through to the
 * upstream ``ExploreViewContainer``.
 */
import React from 'react';
import ExploreViewContainer from 'src/explore/components/ExploreViewContainer';

const PinterestExploreViewContainer = () => <ExploreViewContainer />;

export default PinterestExploreViewContainer;
