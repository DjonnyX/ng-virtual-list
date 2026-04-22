type Dir = 1 | 0 | -1;

export class ScrollingDirection {
    private _value: number = 0;

    constructor(private _length: number = 5) { }

    add(v: Dir) {
        this._value += v;
    }

    get(): Dir {
        const v = this._value < this._length ? -this._length : this._value > this._length ? this._length : this._value;
        return v === 0 ? 0 : Math.sign(v) as Dir;
    }

    clear() {
        this._value = 0;
    }
}