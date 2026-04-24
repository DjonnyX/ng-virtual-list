import { IRect } from "../interfaces";

/**
 * Measures for IRenderVirtualListItem
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/render-item-measures.model.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRenderVirtualListItemMeasures extends IRect {
    /**
     * The X coordinate after transformation.
     */
    transformedX: number;
    /**
     * The Y coordinate after transformation.
     */
    transformedY: number;
    /**
     * The Z coordinate.
     */
    z: number;
    /**
     * Rotation X
     */
    rotationX: number;
    /**
     * Rotation Y
     */
    rotationY: number;
    /**
     * Rotation Z
     */
    rotationZ: number;
    /**
     * Scale X
     */
    scaleX: number;
    /**
     * Scale Y
     */
    scaleY: number;
    /**
     * Scale Z
     */
    scaleZ: number;
    /**
     * Item position
     */
    position: number;
    /**
     * Scroll size
     */
    scrollSize: number;
    /**
     * Item size
     */
    size: number;
    /**
     * Row
     */
    row: {
        size: number;
    };
    /**
     * Bounds size
     */
    boundsSize: number;
    /**
     * Start position in viewport
     */
    absoluteStartPosition: number;
    /**
     * Start position in viewport (percent)
     */
    absoluteStartPositionPercent: number;
    /**
     * End position in viewport
     */
    absoluteEndPosition: number;
    /**
     * End position in viewport (percent)
     */
    absoluteEndPositionPercent: number;
    /**
     * Delta is calculated for Snapping Method.ADVANCED
     */
    delta: number;
};