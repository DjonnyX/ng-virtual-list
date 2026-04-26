import { PX } from '../const';
import { IItemTransformation } from '../interfaces';
import { IRenderVirtualListItemConfig, IRenderVirtualListItemMeasures } from '../models';
import { Color, ItemTransform } from '../types';

const UNSET = 'unset',
    B_LIMIT = 0.5;

interface IDeckOfCardsOptions {
    dof?: number;
    fogColor?: Color;
    fogWeight?: number;
}

/**
 * deckOfCards
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/transformations/deck-of-cards.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const deckOfCards = (options?: IDeckOfCardsOptions): ItemTransform => {
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
            itemSize = isVertical ? measures.height : measures.width,
            itemSizeHalf = itemSize * .5,
            boundsSizeHalf = boundsSize * .5,
            xx = isVertical ? measures.x : (measures.x - itemSizeHalf - boundsSizeHalf - scrollSize),
            yy = isVertical ? (measures.y - itemSizeHalf - boundsSizeHalf - scrollSize) : measures.y,
            pxOffset = isVertical ? boundsSizeHalf : xx, px = isVertical ? 1 : (pxOffset / boundsSizeHalf),
            pyOffset = isVertical ? yy : boundsSizeHalf, py = isVertical ? (pyOffset / boundsSizeHalf) : 1;

        if (config.snapped || config.snappedOut) {
            result.x = measures.x;
            result.y = measures.y;
            result.zIndex = config.zIndex;
        } else {
            result.x = isVertical ? xx : (scrollSize + boundsSizeHalf - itemSizeHalf + (xx * .5 * Math.abs(Math.sin(px))));
            result.y = isVertical ? (scrollSize + boundsSizeHalf - itemSizeHalf + (yy * .5 * Math.abs(Math.sin(py)))) : yy;
            const s = (isVertical ? Math.abs(yy) : Math.abs(xx)) / boundsSize, scale = Math.pow(1 - s * .05, 4);
            result.scaleX = result.scaleY = scale > 1 ? 1 : scale;
            result.zIndex = 100 - Math.floor(Math.abs(isVertical ? py : px) * 100);
            if (!!dof) {
                const blur = (s * dof) - B_LIMIT,
                    actualBlur = blur > 0 ? blur : 0;
                result.filter = actualBlur ? `blur(${actualBlur}${PX})` : UNSET;
            }
            if (!!fogColor) {
                result.opacity = fogWeight ? Math.pow(scale, fogWeight) : scale;
                result.blendColor = fogColor;
            }
        }
        return result;
    }
}