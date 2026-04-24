import { IItemTransformation } from '../interfaces';
import { IRenderVirtualListItemConfig, IRenderVirtualListItemMeasures } from '../models';
import { ItemTransform } from '../types';

export const carouselDeckOfCards: ItemTransform = (index: number, measures: IRenderVirtualListItemMeasures,
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
        itemSize = measures.size,
        itemSizeHalf = itemSize * .5,
        boundsSizeHalf = boundsSize * .5,
        xx = isVertical ? measures.x : (measures.x - itemSizeHalf - boundsSizeHalf - scrollSize),
        yy = isVertical ? (measures.y - itemSizeHalf - boundsSizeHalf - scrollSize) : measures.y,
        pxOffset = isVertical ? boundsSizeHalf : xx, px = isVertical ? 1 : (pxOffset / boundsSizeHalf),
        pyOffset = isVertical ? yy : boundsSizeHalf, py = isVertical ? (pyOffset / boundsSizeHalf) : 1;
    result.x = isVertical ? xx : (scrollSize + boundsSizeHalf - itemSizeHalf + (xx * .5) * Math.abs(Math.sin(px)));
    result.y = isVertical ? (scrollSize + boundsSizeHalf + itemSizeHalf + (yy * .5)) : yy;
    const scale = Math.pow(1 - ((isVertical ? Math.abs(yy) : Math.abs(xx)) / boundsSize) * .05, 4);
    result.scaleX = result.scaleY = scale > 1 ? 1 : scale;
    result.zIndex = 100 - Math.floor(Math.abs(isVertical ? py : px) * 100);
    return result;
}