import { ScrollDirection } from "../models";
import { debounce } from "./debounce";
import { EventEmitter, TEventHandler } from "./eventEmitter";

export class CMap<K = string, V = any> {
    private _dict: { [k: string | number]: V } = {};

    constructor(dict?: CMap<K, V>) {
        if (dict) {
            this._dict = { ...dict._dict };
        }
    }

    get(key: K) {
        const k = String(key);
        return this._dict[k];
    }
    set(key: K, value: V) {
        const k = String(key);
        this._dict[k] = value;
        return this;
    }
    has(key: K) {
        return this._dict.hasOwnProperty(String(key));
    }
    delete(key: K) {
        const k = String(key);
        delete this._dict[k];
    }
    clear() {
        this._dict = {};
    }
}

export interface ICacheMap<I = any, B = any> {
    set: (id: I, bounds: B) => CMap<I, B>;
    has: (id: I) => boolean;
    get: (id: I) => B | undefined;
}

export const CACHE_BOX_CHANGE_EVENT_NAME = 'change';

type CacheMapEvents = typeof CACHE_BOX_CHANGE_EVENT_NAME;

type OnChangeEventListener = (version: number) => void;

type CacheMapListeners = OnChangeEventListener;

const MAX_SCROLL_DIRECTION_POOL = 50, CLEAR_SCROLL_DIRECTION_TO = 10,
    DIR_BACK = '-1', DIR_NONE = '0', DIR_FORWARD = '1';

/**
 * Cache map.
 * Emits a change event on each mutation.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/utils/cacheMap.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class CacheMap<I = string | number, B = any, E extends string = CacheMapEvents, L extends TEventHandler = CacheMapListeners>
    extends EventEmitter<E, L> implements ICacheMap {
    protected _map = new CMap<I, B>();

    protected _snapshot = new CMap<I, B>();

    protected _version: number = 0;

    protected _previousVersion = this._version;

    protected _lifeCircleTimeout: any;

    protected _delta: number = 0;

    get delta() {
        return this._delta;
    }

    protected _deltaDirection: ScrollDirection = 0;
    set deltaDirection(v: ScrollDirection) {
        this._deltaDirection = v;

        this._scrollDirection = this.calcScrollDirection(v);
    }
    get deltaDirection() {
        return this._deltaDirection;
    }

    private _scrollDirectionCache: Array<ScrollDirection> = [];
    private _scrollDirection: ScrollDirection = 0;
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
        this.lifeCircle();
    }

    protected changesDetected() {
        return this._version !== this._previousVersion;
    }

    protected stopLifeCircle() {
        clearTimeout(this._lifeCircleTimeout);
    }

    protected nextTick(cb: () => void) {
        if (this._disposed) {
            return;
        }

        this._lifeCircleTimeout = setTimeout(() => {
            cb();
        });
        return this._lifeCircleTimeout;
    }

    protected lifeCircle() {
        this.fireChangeIfNeed();

        this.lifeCircleDo();
    }

    protected lifeCircleDo() {
        this._previousVersion = this._version;

        this.nextTick(() => {
            this.lifeCircle();
        });
    }

    clearScrollDirectionCache() {
        this._clearScrollDirectionDebounce.execute();
    }

    private calcScrollDirection(v: ScrollDirection): ScrollDirection {
        while (this._scrollDirectionCache.length >= MAX_SCROLL_DIRECTION_POOL) {
            this._scrollDirectionCache.shift();
        }
        this._scrollDirectionCache.push(v);
        const dict: { [x: string]: number } = { [DIR_BACK]: 0, [DIR_NONE]: 0, [DIR_FORWARD]: 0 };
        for (let i = 0, l = this._scrollDirectionCache.length, li = l - 1; i < l; i++) {
            const dir = String(this._scrollDirectionCache[i]);
            dict[dir] += 1;
            if (i === li) {
                for (let d in dict) {
                    if (d === String(v)) {
                        continue;
                    }
                    dict[d] -= 1;
                }
            }
        }

        if (dict[DIR_BACK] > dict[DIR_NONE] && dict[DIR_BACK] > dict[DIR_FORWARD]) {
            return -1;
        } else if (dict[DIR_FORWARD] > dict[DIR_BACK] && dict[DIR_FORWARD] > dict[DIR_NONE]) {
            return 1;
        }

        return 0;
    }

    protected bumpVersion() {
        if (this.changesDetected()) {
            return;
        }
        const v = this._version === Number.MAX_SAFE_INTEGER ? 0 : this._version + 1;
        this._version = v;
    }

    protected fireChangeIfNeed() {
        if (this.changesDetected()) {
            this.dispatch(CACHE_BOX_CHANGE_EVENT_NAME as E, this.version);
        }
    }

    set(id: I, bounds: B): CMap<I, B> {
        if (this._map.has(id)) {
            const b: any = this._map.get(id), bb: any = bounds;
            if (b.width === bb.width && b.height === bb.height) {
                return this._map;
            }
            return this._map;
        }

        const v = this._map.set(id, bounds);

        this.bumpVersion();

        return v;
    }

    has(id: I): boolean {
        return this._map.has(id);
    }

    get(id: I): B | undefined {
        return this._map.get(id);
    }

    snapshot() {
        this._snapshot = new CMap(this._map);
    }

    override dispose() {
        super.dispose();

        this.stopLifeCircle();

        this._snapshot.clear();

        this._map.clear();
    }
}