import { ScrollDirection } from "../types";
import { debounce } from "../utils";
import { EventEmitter } from "../utils/event-emitter";
import { CMap } from "../utils/cmap";

export interface ICacheMap<I = any, B = any> {
    set: (id: I, bounds: B) => CMap<I, B>;
    has: (id: I) => boolean;
    get: (id: I) => B | undefined;
    delete: (id: I) => void;
    clear: () => void;
}

export const CACHE_BOX_CHANGE_EVENT_NAME = 'change';

type CacheMapEvents = typeof CACHE_BOX_CHANGE_EVENT_NAME;

type OnChangeEventListener = (version: number) => void;

type CacheMapListeners = OnChangeEventListener;

/**
 * Cache map.
 * Emits a change event on each mutation.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/core/cache-map.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class CacheMap<I = string | number, B = any, E = CacheMapEvents, L = CacheMapListeners> extends EventEmitter<E, L> implements ICacheMap {
    protected _map = new CMap<I, B>();

    protected _snapshot = new CMap<I, B>();

    protected _version: number = 0;

    protected _previousVersion = this._version;

    protected _lifeCircleId: any;

    protected _delta: number = 0;

    get delta() {
        return this._delta;
    }

    get version() {
        return this._version;
    }

    constructor() {
        super();
        this.lifeCircle();
    }

    protected changesDetected() {
        return this._version !== this._previousVersion;
    }

    protected stopLifeCircle() {
        if (this._lifeCircleId !== undefined) {
            clearTimeout(this._lifeCircleId);
        }
    }

    protected nextTick(cb: () => void) {
        if (this._disposed) {
            return;
        }

        this._lifeCircleId = setTimeout(() => {
            cb();
        });
        return this._lifeCircleId;
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

    delete(id: I) {
        this._map.delete(id);
    }

    clear() {
        this._map.clear();
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