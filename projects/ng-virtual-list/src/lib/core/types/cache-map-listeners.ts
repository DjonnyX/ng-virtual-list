import { OnChangeEventListener } from "./on-change-event-listener";
import { OnTickEventListener } from "./on-tick-event-listener";

/**
 * CacheMapListeners
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/core/types/cache-map-listeners.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export type CacheMapListeners = OnChangeEventListener | OnTickEventListener;
