export class CMap<K = string, V = any> {
    protected _dict: { [k: string | number]: V } = {};

    constructor(dict?: CMap<K, V>) {
        this.from(dict);
    }

    from(dict?: CMap<K, V>) {
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
    toObject() {
        return this._dict;
    }
}