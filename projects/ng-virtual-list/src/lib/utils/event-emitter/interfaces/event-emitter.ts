export type TEventHandler = (...args: Array<any>) => void;

/**
 * Event emitter interface
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/22.x/projects/ng-virtual-list/src/lib/utils/event-emitter/interfaces/event-emitter.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IEventEmitter<E = string, H = TEventHandler> {
    /**
     * Emits the event
     */
    dispatch: (event: E, ...args: Array<any>) => void;

    /**
     * Emits the event async
     */
    dispatchAsync: (event: E, ...args: Array<any>) => void;

    /**
     * Returns true if the event listener is already subscribed.
     */
    hasEventListener: (eventName: E, handler: H) => boolean;

    /**
     * Add event listener
     */
    addEventListener: (eventName: E, handler: H) => void;

    /**
     * Remove event listener
     */
    removeEventListener: (eventName: E, handler: H) => void;

    /**
     * Remove all listeners
     */
    removeAllListeners: () => void;

    /**
     * Method of destroying handlers
     */
    dispose: () => void;
}