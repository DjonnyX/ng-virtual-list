import { SnapToItemAlign } from "../types";
import { Color } from "../types";

/**
 * Object with configuration parameters for IRenderVirtualListItem
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/models/render-item-config.model.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRenderVirtualListItemConfig {
    /**
     * Determines whether an element is new in the collection.
     */
    new: boolean;
    /**
     * Indicates that the element is odd.
     */
    odd: boolean;
    /**
     * Indicates that the element is even.
     */
    even: boolean;
    /**
     * Determines whether an element with a `sticky` property greater than zero can collapse and collapse elements in front that do not have a `sticky` property.
     * Default value is `false`.
     */
    collapsable: boolean;
    /**
     * If greater than 0, the element will have a sticky position with the given zIndex.
     */
    sticky: 0 | 1 | 2;
    /**
     * Determines whether an element can be selected or not. Default value is `true`.
     */
    selectable: boolean;
    /**
     * Specifies whether the element will snap.
     */
    snap: boolean;
    /**
     * Indicates that the element is snapped.
     */
    snapped: boolean;
    /**
     * Indicates that the element is being shifted by another snap element.
     */
    snappedOut: boolean;
    /**
     * Indicates that the element is a vertical list item.
     */
    isVertical: boolean;
    /**
     * Specifies that the element adapts to the size of its content.
     */
    dynamic: boolean;
    /**
     * Returns true if the snapping method is advanced
     */
    isSnappingMethodAdvanced: boolean;
    /**
     * layout offset;
     */
    layoutOffset: number;
    /**
     * layout index offset;
     */
    layoutIndexOffset: number;
    /**
     * Tab index.
     */
    tabIndex: number;
    /**
     * z-index
     */
    zIndex: string;
    /**
     * Opacity.
     */
    opacity: number;
    /**
     * Filter.
     */
    filter?: string;
    /**
     * Blend color.
     */
    blendColor?: Color | null;
    /**
     * Determines whether an element is a stub.
     */
    isStub?: boolean;
    /**
     * Division number.
     */
    divides: number;
    /**
     * Snap to an item. The default value is `false`.
     */
    snapToItem: boolean;
    /**
     * Alignment for snapToItem. Available values ​​are `start`, `center`, and `end`. The default value is `center`.
     */
    snapToItemAlign: SnapToItemAlign;
    /**
     * Indicates whether the element is the first in the collection.
     */
    isFirst: boolean;
    /**
     * Indicates whether the element is the last one in the collection.
     */
    isLast: boolean;
    /**
     * Determines the size of an element when rendering lists with cell divisions. If sticky is 1 or 2, fullSize automatically becomes true.
     */
    fullSize: boolean;
    /**
     * Number of elements in the collection to be visualized.
     */
    totalItems: number;
}