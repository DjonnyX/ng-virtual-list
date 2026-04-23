import { IItemTransformation } from '../interfaces';
import { IRenderVirtualListItemConfig, IRenderVirtualListItemMeasures } from '../models';
import { ItemTransform } from '../types';

export const carouselEventHorizon: ItemTransform = (index: number, measures: IRenderVirtualListItemMeasures,
    config: IRenderVirtualListItemConfig): IItemTransformation => {
    const result: IItemTransformation = {
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        opacity: 1,
        zIndex: 1,
    },
        isVertical = config.isVertical,
        boundsSize = measures.boundsSize,
        scrollSize = measures.scrollSize,
        itemSizeHalf = measures.size * .5,
        boundsSizeHalf = boundsSize * .5,
        xx = isVertical ? measures.x : (measures.x - itemSizeHalf - boundsSizeHalf - scrollSize),
        yy = isVertical ? (measures.y - itemSizeHalf - boundsSizeHalf - scrollSize) : measures.y,
        pxOffset = isVertical ? boundsSizeHalf : xx, px = isVertical ? 1 : (pxOffset / boundsSizeHalf),
        pyOffset = isVertical ? yy : boundsSizeHalf, py = isVertical ? (pyOffset / boundsSizeHalf) : 1;
    result.x = isVertical ? xx : (scrollSize + boundsSizeHalf - itemSizeHalf + (xx * Math.pow(px, 2)));
    result.y = isVertical ? (scrollSize + boundsSizeHalf + itemSizeHalf + (yy / Math.pow(py, 2))) : yy;
    result.zIndex = 100 - Math.floor(Math.abs(isVertical ? py : px) * 100);
    return result;
}