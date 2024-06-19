import { LightnessToAlphaFilter } from 'features/controlLayers/konva/filters';
import { CA_LAYER_IMAGE_NAME, CA_LAYER_NAME, CA_LAYER_OBJECT_GROUP_NAME } from 'features/controlLayers/konva/naming';
import type { EntityKonvaAdapter, ImageObjectRecord, KonvaNodeManager } from 'features/controlLayers/konva/nodeManager';
import {
  createImageObjectGroup,
  createObjectGroup,
  updateImageSource,
} from 'features/controlLayers/konva/renderers/objects';
import type { ControlAdapterEntity } from 'features/controlLayers/store/types';
import Konva from 'konva';
import { isEqual } from 'lodash-es';
import { assert } from 'tsafe';

/**
 * Logic for creating and rendering control adapter (control net & t2i adapter) layers. These layers have image objects
 * and require some special handling to update the source and attributes as control images are swapped or processed.
 */

/**
 * Creates a control adapter layer.
 * @param stage The konva stage
 * @param entity The control adapter layer state
 */
const getControlAdapter = (manager: KonvaNodeManager, entity: ControlAdapterEntity): EntityKonvaAdapter => {
  const adapter = manager.get(entity.id);
  if (adapter) {
    return adapter;
  }
  const konvaLayer = new Konva.Layer({
    id: entity.id,
    name: CA_LAYER_NAME,
    imageSmoothingEnabled: false,
    listening: false,
  });
  const konvaObjectGroup = createObjectGroup(konvaLayer, CA_LAYER_OBJECT_GROUP_NAME);
  konvaLayer.add(konvaObjectGroup);
  manager.stage.add(konvaLayer);
  return manager.add(entity.id, konvaLayer, konvaObjectGroup);
};

/**
 * Renders a control adapter layer. If the layer doesn't already exist, it is created. Otherwise, the layer is updated
 * with the current image source and attributes.
 * @param stage The konva stage
 * @param entity The control adapter layer state
 * @param getImageDTO A function to retrieve an image DTO from the server, used to update the image source
 */
export const renderControlAdapter = async (manager: KonvaNodeManager, entity: ControlAdapterEntity): Promise<void> => {
  const adapter = getControlAdapter(manager, entity);
  const imageObject = entity.processedImageObject ?? entity.imageObject;

  if (!imageObject) {
    // The user has deleted/reset the image
    adapter.getAll().forEach((entry) => {
      adapter.destroy(entry.id);
    });
    return;
  }

  let entry = adapter.getAll<ImageObjectRecord>()[0];
  const opacity = entity.opacity;
  const visible = entity.isEnabled;
  const filters = entity.filter === 'LightnessToAlphaFilter' ? [LightnessToAlphaFilter] : [];

  if (!entry) {
    entry = await createImageObjectGroup({
      adapter: adapter,
      obj: imageObject,
      name: CA_LAYER_IMAGE_NAME,
      onLoad: (konvaImage) => {
        konvaImage.filters(filters);
        konvaImage.cache();
        konvaImage.opacity(opacity);
        konvaImage.visible(visible);
      },
    });
  } else {
    if (entry.isLoading || entry.isError) {
      return;
    }
    assert(entry.konvaImage, `Image entry ${entry.id} must have a konva image if it is not loading or in error state`);
    const imageSource = entry.konvaImage.image();
    assert(imageSource instanceof HTMLImageElement, `Image source must be an HTMLImageElement`);
    if (imageSource.id !== imageObject.image.name) {
      updateImageSource({
        objectRecord: entry,
        image: imageObject.image,
        onLoad: (konvaImage) => {
          konvaImage.filters(filters);
          konvaImage.cache();
          konvaImage.opacity(opacity);
          konvaImage.visible(visible);
        },
      });
    } else {
      if (!isEqual(entry.konvaImage.filters(), filters)) {
        entry.konvaImage.filters(filters);
        entry.konvaImage.cache();
      }
      entry.konvaImage.opacity(opacity);
      entry.konvaImage.visible(visible);
    }
  }
};

export const renderControlAdapters = (manager: KonvaNodeManager, entities: ControlAdapterEntity[]): void => {
  // Destroy nonexistent layers
  for (const adapters of manager.getAll()) {
    if (!entities.find((ca) => ca.id === adapters.id)) {
      manager.destroy(adapters.id);
    }
  }
  for (const entity of entities) {
    renderControlAdapter(manager, entity);
  }
};