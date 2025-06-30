import { ScrollDirection } from "./scroll-direction.model";

/**
 * Interface IScrollEvent.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/models/scroll-event.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IScrollEvent {
    /**
     * Scroll area offset
     */
    scrollSize: number;
    /**
     * Full size of the scroll area
     */
    scrollWeight: number;
    /**
     * Viewport size
     */
    size: number;
    /**
     * Size of the list of elements
     */
    listSize: number;
    /**
     * Specifies whether the list orientation is vertical.
     */
    isVertical: boolean;
    /**
     * A value of -1 indicates the direction is up or left (if the list direction is horizontal).
     * A value of 1 indicates the direction is down or right (if the list direction is horizontal).
     */
    direction: ScrollDirection;
    /**
     * If true then indicates that the list has been scrolled to the end.
     */
    isStart: boolean;
    /**
     * If true then indicates that the list has been scrolled to the end.
     */
    isEnd: boolean;
    /**
     * Delta of marked and unmarked area
     */
    delta: number;
    /**
     * Scroll delta
     */
    scrollDelta: number;
}
