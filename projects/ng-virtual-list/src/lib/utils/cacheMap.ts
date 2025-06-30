import { ScrollDirection } from "../models";
import { debounce } from "./debounce";
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

const MAX_SCROLL_DIRECTION_POOL = 8, CLEAR_SCROLL_DIRECTION_TO = 0;

/**
 * Cache map.
 * Emits a change event on each mutation.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/utils/cacheMap.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class CacheMap<I = string | number, B = any, E = CacheMapEvents, L = CacheMapListeners> extends EventEmitter<E, L> implements ICacheMap {
    protected _map = new Map<I, B>();

    protected _version: number = 0;

    protected _previouseFullSize: number = 0;

    protected _delta: number = 0;

    get delta() {
        return this._delta;
    }

    protected _deltaDirection: ScrollDirection = 1;
    set deltaDirection(v: ScrollDirection) {
        this._deltaDirection = v;

        this._scrollDirection = this.calcScrollDirection(v);
    }
    get deltaDirection() {
        return this._deltaDirection;
    }

    private _scrollDirectionCache: Array<ScrollDirection> = [];
    private _scrollDirection: ScrollDirection = -1;
    get scrollDirection() {
        return this._scrollDirection;
    }

    get version() {
        return this._version;
    }

    private _clearScrollDirectionDebounce = debounce(() => {
        while (this._scrollDirectionCache.length > CLEAR_SCROLL_DIRECTION_TO) {
            this._scrollDirectionCache.shift();
        }
    }, 10);

    constructor() {
        super();
    }

    clearScrollDirectionCache() {
        this._clearScrollDirectionDebounce.execute();
    }

    private calcScrollDirection(v: ScrollDirection): ScrollDirection {
        while (this._scrollDirectionCache.length >= MAX_SCROLL_DIRECTION_POOL) {
            this._scrollDirectionCache.shift();
        }
        this._scrollDirectionCache.push(v);
        const dict = { [-1]: 0, [0]: 0, [1]: 0 };
        for (let i = 0, l = this._scrollDirectionCache.length; i < l; i++) {
            const dir = this._scrollDirectionCache[i];
            dict[dir] += 1;
        }

        if (dict[-1] > dict[1]) {
            return -1;
        } else if (dict[1] > dict[-1]) {
            return 1;
        }

        return -1;
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