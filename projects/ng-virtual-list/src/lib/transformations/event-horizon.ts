import { PX } from '../const';
import { IItemTransformation } from '../interfaces';
import { IRenderVirtualListItemConfig, IRenderVirtualListItemMeasures } from '../models';
import { Color, ItemTransform } from '../types';

interface IEventHorizonOptions {
    dof?: number;
    fogColor?: Color;
    fogWeight?: number;
}

/**
 * eventHorizon
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/transformations/event-horizon.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const eventHorizon = (options?: IEventHorizonOptions): ItemTransform => {
    const dof = options?.dof ?? null,
        fogColor = options?.fogColor ?? null,
        fogWeight = options?.fogWeight ?? null;
    return (index: number, measures: IRenderVirtualListItemMeasures,
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
        result.x = isVertical ? xx : (scrollSize + boundsSizeHalf - itemSizeHalf + (xx * Math.pow(px, 2) * .025));
        result.y = isVertical ? (scrollSize + boundsSizeHalf + itemSizeHalf + (yy * Math.pow(py, 0.5))) : yy;
        const s = (isVertical ? Math.abs(yy) : Math.abs(xx)) / boundsSize, scale = Math.pow(1 - s * .15, 4);
        result.zIndex = 100 - Math.floor(Math.abs(isVertical ? py : px) * 100);
        if (!!dof) {
            result.filter = `blur(${s * dof}${PX})`;
        }
        if (!!fogColor) {
            result.opacity = !!fogWeight ? (scale * fogWeight) : scale;
            result.blendColor = fogColor;
        }
        return result;
    }
}