export type TEventHandler = (...args: Array<any>) => void;

/**
 * Event emitter
 * @link https://github.com/DjonnyX/data-channel-router/blob/main/library/src/utils/event-emitter/event-emitter.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class EventEmitter<E = string, H = TEventHandler> {
    protected _listeners: {
        [eventName: string]: Array<TEventHandler>,
    } = {};

    protected _disposed: boolean = false;

    constructor() { }

    /**
     * Emits the event
     */
    dispatch(event: E, ...args: Array<any>): void {
        const ctx = this;
        const listeners = this._listeners[event as unknown as string];
        if (Array.isArray(listeners)) {
            for (let i = 0, l = listeners.length; i < l; i++) {
                const listener = listeners[i];
                if (listener) {
                    listener.apply(ctx, args);
                }
            }
        }
    }

    /**
     * Emits the event async
     */
    dispatchAsync(event: E, ...args: Array<any>): void {
        queueMicrotask(() => {
            if (this._disposed) {
                return;
            }
            this.dispatch(event, ...args);
        });
    }

    /**
     * Returns true if the event listener is already subscribed.
     */
    hasEventListener(eventName: E, handler: H): boolean {
        const event = eventName as unknown as string;
        if (this._listeners[event] !== undefined) {
            const listeners = this._listeners[event];
            const index = listeners.findIndex(v => v === (handler as any));
            if (index > -1) {
                return true;
            }
        }
        return false
    }

    /**
     * Add event listener
     */
    addEventListener(eventName: E, handler: H): void {
        const event = eventName as unknown as string;
        if (!this._listeners.hasOwnProperty(event)) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(handler as unknown as TEventHandler);
    }

    /**
     * Remove event listener
     */
    removeEventListener(eventName: E, handler: H): void {
        const event = eventName as unknown as string;
        if (!this._listeners.hasOwnProperty(event)) {
            return;
        }
        const listeners = this._listeners[event], index = listeners.findIndex(v => v === handler as any);
        if (index > -1) {
            listeners.splice(index, 1);

            if (listeners.length === 0) {
                delete this._listeners[event];
            }
        }
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        const events = Object.keys(this._listeners);
        while (events.length > 0) {
            const event = events.pop();
            if (event) {
                const listeners = this._listeners[event];
                if (Array.isArray(listeners)) {
                    while (listeners.length > 0) {
                        const listener = listeners.pop();
                        if (listener) {
                            this.removeEventListener(event as unknown as E, listener as unknown as H);
                        }
                    }
                }
            }
        }
    }

    /**
     * Method of destroying handlers
     */
    dispose() {
        this._disposed = true;

        this.removeAllListeners();
    }
}