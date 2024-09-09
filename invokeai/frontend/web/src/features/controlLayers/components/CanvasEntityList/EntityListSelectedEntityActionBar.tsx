import { Flex, Spacer } from '@invoke-ai/ui-library';
import { EntityListSelectedEntityActionBarDuplicateButton } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarDuplicateButton';
import { EntityListSelectedEntityActionBarFill } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarFill';
import { EntityListSelectedEntityActionBarFilterButton } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarFilterButton';
import { EntityListSelectedEntityActionBarOpacity } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarOpacity';
import { EntityListSelectedEntityActionBarTransformButton } from 'features/controlLayers/components/CanvasEntityList/EntityListSelectedEntityActionBarTransformButton';
import { memo } from 'react';

export const EntityListSelectedEntityActionBar = memo(() => {
  return (
    <Flex w="full" gap={2} alignItems="center" ps={1}>
      <EntityListSelectedEntityActionBarOpacity />
      <Spacer />
      <EntityListSelectedEntityActionBarFill />
      <Flex>
        <EntityListSelectedEntityActionBarFilterButton />
        <EntityListSelectedEntityActionBarTransformButton />
        <EntityListSelectedEntityActionBarDuplicateButton />
      </Flex>
    </Flex>
  );
});

EntityListSelectedEntityActionBar.displayName = 'EntityListSelectedEntityActionBar';
