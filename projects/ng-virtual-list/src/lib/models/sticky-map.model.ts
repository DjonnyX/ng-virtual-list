export interface IVirtualListStickyMap {
    /**
     * Sets zIndex for the element ID. If zIndex is greater than 0, then sticky position is applied.
     */
    [id: string]: number;
}