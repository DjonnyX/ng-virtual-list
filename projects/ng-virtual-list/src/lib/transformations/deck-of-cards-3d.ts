import { PX } from '../const';
import { IItemTransformation } from '../interfaces';
import { IRenderVirtualListItemConfig, IRenderVirtualListItemMeasures } from '../models';
import { Color, ItemTransform } from '../types';

const UNSET = 'unset',
    B_LIMIT = 0.5;

export interface IDeckOfCards3DOptions {
    /**
     * Depth Of Field. Default value is `null`.
     */
    dof?: number;
    /**
     * Fog color. Default value is `null`.
     */
    fogColor?: Color;
    /**
     * Fog weight. Default value is `null`.
     */
    fogWeight?: number;
    /**
     * Spacing between items. Default value is `0.5`.
     */
    spacingBetweenItems?: number;
    /**
     * Angle of inclination. Default value is `1`.
     */
    angle?: number;
    /**
     * Depth. Default value is `0.15`.
     */
    depth?: number;
    /**
     * Scale. Default value is `0.15`.
     */
    scale?: number;
    /**
     * Scale X. Default value is `null`.
     */
    scaleX?: number | null;
    /**
     * Scale Y. Default value is `null`.
     */
    scaleY?: number | null;
    /**
     * Depth exponent. Default value is `4`.
     */
    depthPow?: number;
    /**
     * Sinusoidal distribution. Default value is `false`.
     */
    sineWave?: boolean;
}

/**
 * deckOfCards3D
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/transformations/deck-of-cards-3d.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export const deckOfCards3D = (options?: IDeckOfCards3DOptions): ItemTransform => {
    const dof = options?.dof ?? null,
        fogColor = options?.fogColor ?? null,
        fogWeight = options?.fogWeight ?? null,
        spacingBetweenItems = options?.spacingBetweenItems ?? .5,
        angle = options?.angle ?? 1,
        depth = options?.depth ?? .15,
        scaleValue = options?.scale ?? .15,
        scaleXValue = options?.scaleX ?? null,
        scaleYValue = options?.scaleY ?? null,
        depthPow = options?.depthPow ?? 4,
        sineWave = options?.sineWave ?? false;
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
            xx = isVertical ? measures.x : (measures.x + config.layoutOffset + itemSizeHalf - boundsSizeHalf - scrollSize),
            yy = isVertical ? (measures.y + config.layoutOffset + itemSizeHalf - boundsSizeHalf - scrollSize) : measures.y,
            pxOffset = isVertical ? boundsSizeHalf : xx, px = isVertical ? 1 : (pxOffset / boundsSizeHalf),
            pyOffset = isVertical ? yy : boundsSizeHalf, py = isVertical ? (pyOffset / boundsSizeHalf) : 1;
        if (config.snapped || config.snappedOut) {
            result.x = measures.x;
            result.y = measures.y;
            result.zIndex = config.zIndex;
        } else {
            result.x = isVertical ? xx : (scrollSize - config.layoutOffset + boundsSizeHalf - itemSizeHalf + (xx * spacingBetweenItems * (sineWave ? Math.abs(Math.sin(px)) : 1)));
            result.y = isVertical ? (scrollSize - config.layoutOffset + boundsSizeHalf - itemSizeHalf + (yy * spacingBetweenItems * (sineWave ? Math.abs(Math.sin(py)) : 1))) : yy;
            const s = (isVertical ? Math.abs(yy) : Math.abs(xx)) / boundsSize, scale = Math.pow(1 - s * scaleValue, depthPow),
                scaleX = scaleXValue !== null ? Math.pow(1 - s * scaleXValue, depthPow) : null,
                scaleY = scaleYValue !== null ? Math.pow(1 - s * scaleYValue, depthPow) : null,
                dofScale = Math.pow(1 - s * depth, depthPow);
            if (scaleXValue === null && scaleYValue === null) {
                const z = scale + .1;
                result.z = z > 1 ? 1 : z;
                result.scaleX = result.scaleY = scale;
            } else {
                result.scaleX = scaleX !== null ? scaleX : 1;
                result.scaleY = scaleY !== null ? scaleY : 1;
            }
            result.rotationX = (isVertical ? py : px) * 200 * angle;
            result.zIndex = 100 - Math.floor(Math.abs(isVertical ? py : px) * 100);
            if (!!dof) {
                const blur = (s * dof) - B_LIMIT,
                    actualBlur = blur > 0 ? blur : 0;
                result.filter = actualBlur ? `blur(${actualBlur}${PX})` : UNSET;
            }
            if (!!fogColor) {
                result.opacity = fogWeight ? Math.pow(dofScale, fogWeight) : scale;
                result.blendColor = fogColor;
            }
        }
        return result;
    }
}