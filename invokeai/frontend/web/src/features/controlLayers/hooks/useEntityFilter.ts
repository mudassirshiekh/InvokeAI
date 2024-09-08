import { useStore } from '@nanostores/react';
import { useAppSelector } from 'app/store/storeHooks';
import { SyncableMap } from 'common/util/SyncableMap/SyncableMap';
import { useCanvasManager } from 'features/controlLayers/contexts/CanvasManagerProviderGate';
import { useCanvasIsBusy } from 'features/controlLayers/hooks/useCanvasIsBusy';
import { useEntityAdapterSafe } from 'features/controlLayers/hooks/useEntityAdapter';
import type { AnyObjectRenderer } from 'features/controlLayers/konva/CanvasObject/types';
import { getEmptyRect } from 'features/controlLayers/konva/util';
import { selectIsStaging } from 'features/controlLayers/store/canvasStagingAreaSlice';
import type { CanvasEntityIdentifier, Rect } from 'features/controlLayers/store/types';
import { isFilterableEntityIdentifier } from 'features/controlLayers/store/types';
import { atom } from 'nanostores';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

// When the entity is empty (the rect has no size) or there are no renderers, we have nothing to filter. Because the
// entity is dynamic, and we need reactivity on these values, we need to do a little hack. These fallback objects
// can be used to provide a default value for the useStore and useSyncExternalStore hooks, which require _some_ value
// to be used.
const $fallbackPixelRect = atom<Rect>(getEmptyRect());
const fallbackRenderersMap = new SyncableMap<string, AnyObjectRenderer>();

export const useEntityFilter = (entityIdentifier: CanvasEntityIdentifier | null) => {
  const canvasManager = useCanvasManager();
  const adapter = useEntityAdapterSafe(entityIdentifier);
  const isStaging = useAppSelector(selectIsStaging);
  const isBusy = useCanvasIsBusy();
  // Use the fallback pixel rect if the adapter is not available
  const pixelRect = useStore(adapter?.transformer.$pixelRect ?? $fallbackPixelRect);
  // Use the fallback renderers map if the adapter is not available
  const renderers = useSyncExternalStore(
    adapter?.renderer.renderers.subscribe ?? fallbackRenderersMap.subscribe,
    adapter?.renderer.renderers.getSnapshot ?? fallbackRenderersMap.getSnapshot
  );

  const isDisabled = useMemo(() => {
    if (!entityIdentifier) {
      return true;
    }
    if (!isFilterableEntityIdentifier(entityIdentifier)) {
      return true;
    }
    if (!adapter) {
      return true;
    }
    if (isBusy || isStaging) {
      return true;
    }
    if (pixelRect.width === 0 || pixelRect.height === 0) {
      return true;
    }
    if (renderers.size === 0) {
      return true;
    }
    return false;
  }, [entityIdentifier, adapter, isBusy, isStaging, pixelRect.width, pixelRect.height, renderers.size]);

  const start = useCallback(() => {
    if (isDisabled) {
      return;
    }
    if (!entityIdentifier) {
      return;
    }
    if (!isFilterableEntityIdentifier(entityIdentifier)) {
      return;
    }
    const adapter = canvasManager.getAdapter(entityIdentifier);
    if (!adapter) {
      return;
    }
    adapter.filterer.startFilter();
  }, [isDisabled, entityIdentifier, canvasManager]);

  return { isDisabled, start } as const;
};