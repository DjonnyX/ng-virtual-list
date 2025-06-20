export interface IRenderVirtualListItemConfig {
    /**
     * If greater than 0, the element will have a sticky position with the given zIndex.
     */
    sticky: number;
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
}