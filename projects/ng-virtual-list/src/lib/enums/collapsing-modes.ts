/**
 * Modes for collapsing list items.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/enums/collapsing-modes.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export enum CollapsingModes {
    /**
     * List items are not selectable.
     */
    NONE = 'none',
    /**
     * List items are collapsed one by one.
     */
    MULTI_COLLAPSE = 'multi-collapse',
    /**
     * Accordion collapsible list items.
     */
    ACCORDION = 'accordion',
}