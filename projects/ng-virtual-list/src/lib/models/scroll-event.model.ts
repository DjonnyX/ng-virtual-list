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
     * A value of -1 indicates the direction is up or left (if the list direction is horizontal).
     * A value of 1 indicates the direction is down or right (if the list direction is horizontal).
     */
    direction: ScrollDirection;
}
