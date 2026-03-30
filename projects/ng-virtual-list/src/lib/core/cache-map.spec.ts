import { CacheMap } from './cache-map';
import { CMap } from '../utils/cmap';
import { ISize } from '../interfaces';

class CMapTested<K = string, V = any> extends CMap<K, V> {
    override toObject() {
        return this._dict;
    }
}

describe('CMap', () => {
    it('The `set` method should work correctly', () => {
        const map = new CMapTested<any, string>(), KEY = 'key', VALUE = 'test';
        map.set(KEY, VALUE);
        const obj = map.toObject(), RESULT = obj[KEY];
        expect(RESULT).toEqual(VALUE);
    });

    it('The `get` method should work correctly', () => {
        const map = new CMapTested<any, string>(), KEY = 'key', VALUE = 'test';
        map.set(KEY, VALUE);
        const RESULT = map.get(KEY);
        expect(RESULT).toEqual(VALUE);
    });

    it('The `has` method should work correctly', () => {
        const map = new CMapTested<any, string>(), KEY = 'key', VALUE = 'test';
        map.set(KEY, VALUE);
        const RESULT = map.has(KEY);
        expect(RESULT).toBeTruthy();
    });

    it('The `delete` method should work correctly', () => {
        const map = new CMapTested<any, string>(), KEY = 'key', VALUE = 'test';
        map.set(KEY, VALUE);
        map.delete(KEY);
        const obj = map.toObject(), RESULT = obj.hasOwnProperty(KEY);
        expect(RESULT).toBeFalsy();
    });

    it('The `clear` method should work correctly', () => {
        const map = new CMapTested<any, string>(), KEY1 = 'key1', KEY2 = 'key2', VALUE1 = 'test1', VALUE2 = 'test2';
        map.set(KEY1, VALUE1);
        map.set(KEY2, VALUE2);
        map.clear();
        const obj = map.toObject(), HAS_KEY1 = obj.hasOwnProperty(KEY1), HAS_KEY2 = obj.hasOwnProperty(KEY2);
        expect(HAS_KEY1).toBeFalsy();
        expect(HAS_KEY2).toBeFalsy();
    });
});

type OnChangeEventListener = (version: number) => void;

class CacheMapTested<I = string | number, B = any, E = "change", L = OnChangeEventListener> extends CacheMap<I, B, E, L> {
    get snapshotObject() {
        return this._snapshot;
    }

    override bumpVersion() {
        super.bumpVersion();
    }

    override changesDetected() {
        return super.changesDetected();
    }

    override fireChangeIfNeed() {
        return super.fireChangeIfNeed();
    }

    toObject() {
        return this._map.toObject();
    }
}

describe('CacheMap', () => {
    it('The `set` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>(), KEY = 'key', VALUE = 'test';
        cache.set(KEY, VALUE);
        const obj = cache.toObject(), RESULT = obj[KEY];
        expect(RESULT).toEqual(VALUE);
    });

    it('The `get` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>(), KEY = 'key', VALUE = 'test';
        cache.set(KEY, VALUE);
        const RESULT = cache.get(KEY);
        expect(RESULT).toEqual(VALUE);
    });

    it('The `has` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>(), KEY = 'key', VALUE = 'test';
        cache.set(KEY, VALUE);
        const RESULT = cache.has(KEY);
        expect(RESULT).toBeTruthy();
    });

    it('The `delete` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>(), KEY = 'key', VALUE = 'test';
        cache.set(KEY, VALUE);
        cache.delete(KEY);
        const obj = cache.toObject(), RESULT = obj.hasOwnProperty(KEY);
        expect(RESULT).toBeFalsy();
    });

    it('The `clear` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>(), KEY1 = 'key1', KEY2 = 'key2', VALUE1 = 'test1', VALUE2 = 'test2';
        cache.set(KEY1, VALUE1);
        cache.set(KEY2, VALUE2);
        cache.clear();
        const obj = cache.toObject(), HAS_KEY1 = obj.hasOwnProperty(KEY1), HAS_KEY2 = obj.hasOwnProperty(KEY2);
        expect(HAS_KEY1).toBeFalsy();
        expect(HAS_KEY2).toBeFalsy();
    });

    it('The `snapshot` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>(), KEY1 = 'key1', KEY2 = 'key2', VALUE1 = 'test1', VALUE2 = 'test2';
        cache.set(KEY1, VALUE1);
        cache.set(KEY2, VALUE2);
        cache.snapshot();
        const obj = cache.snapshotObject.toObject(), RESULT1 = obj[KEY1], RESULT2 = obj[KEY2];
        expect(RESULT1).toEqual(VALUE1);
        expect(RESULT2).toEqual(VALUE2);
    });

    it('The `bumpVersion` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>();
        cache.bumpVersion();
        const result = cache.version === 1;
        expect(result).toBeTruthy();
    });

    it('The `changesDetected` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>();
        cache.bumpVersion();
        const needDetectionChanges = cache.changesDetected();
        expect(needDetectionChanges).toBeTruthy();
    });

    it('The `fireChangeIfNeed` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>();
        cache.bumpVersion();
        let markForChanges = false;
        cache.addEventListener('change', () => {
            markForChanges = true;
        });
        cache.fireChangeIfNeed();
        expect(markForChanges).toBeTruthy();
    });

    it('The `change detection` should work correctly', async () => {
        const markForChanges = await new Promise((res) => {
            const cache = new CacheMapTested<any, ISize>();
            cache.set('1', { width: 1, height: 1 });
            cache.addEventListener('change', () => {
                res(true);
            });
            setTimeout(() => {
                res(false);
            }, 100);
        });
        expect(markForChanges).toBeTruthy();
    });

    it('The `dispose` method should work correctly', () => {
        const cache = new CacheMapTested<any, string>(), KEY1 = 'key1', KEY2 = 'key2', VALUE1 = 'test1', VALUE2 = 'test2';
        cache.set(KEY1, VALUE1);
        cache.set(KEY2, VALUE2);
        cache.snapshot();
        cache.dispose();
        const obj = cache.toObject(), HAS_KEY1 = obj.hasOwnProperty(KEY1), HAS_KEY2 = obj.hasOwnProperty(KEY2);
        const obj1 = cache.snapshotObject.toObject(), HAS_KEY3 = obj1.hasOwnProperty(KEY1), HAS_KEY4 = obj1.hasOwnProperty(KEY2);
        expect(HAS_KEY1).toBeFalsy();
        expect(HAS_KEY2).toBeFalsy();
        expect(HAS_KEY3).toBeFalsy();
        expect(HAS_KEY4).toBeFalsy();
    });
});