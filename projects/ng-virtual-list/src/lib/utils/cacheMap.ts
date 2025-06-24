import { EventEmitter } from "./eventEmitter";

export interface ICacheMap<I = any, B = any> {
    set: (id: I, bounds: B) => Map<I, B>;
    has: (id: I) => boolean;
    get: (id: I) => B | undefined;
    forEach: (callbackfn: (value: B, key: I, map: Map<I, B>) => void, thisArg?: any) => void;
}

type CacheMapEvents = 'change';

type OnChangeEventListener = (version: number) => void;

type CacheMapListeners = OnChangeEventListener;

/**
 * Cache map.
 * Emits a change event on each mutation.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/utils/cacheMap.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class CacheMap<I = string | number, B = any, E = CacheMapEvents, L = CacheMapListeners> extends EventEmitter<E, L> implements ICacheMap {
    protected _map = new Map<I, B>();

    protected _version: number = 0;

    protected _previouseFullHeigh: number = 0;

    protected _delta: number = 0;

    get delta() {
        return this._delta;
    }

    get version() {
        return this._version;
    }

    constructor() {
        super();
    }

    protected bumpVersion() {
        this._version = this._version === Number.MAX_SAFE_INTEGER ? 0 : this._version + 1;
    }

    protected fireChange() {
        this.dispatch('change' as E, this.version);
    }

    set(id: I, bounds: B): Map<I, B> {
        if (this._map.has(id) && JSON.stringify(this._map.get(id)) === JSON.stringify(bounds)) {
            return this._map;
        }

        const v = this._map.set(id, bounds);

        this.bumpVersion();

        this.fireChange();

        return v;
    }

    has(id: I): boolean {
        return this._map.has(id);
    }

    get(id: I): B | undefined {
        return this._map.get(id);
    }

    forEach(callbackfn: (value: B, key: I, map: Map<I, B>) => void, thisArg?: any): void {
        return this._map.forEach(callbackfn, thisArg);
    }

    override dispose() {
        super.dispose();

        this._map.clear();
    }
}