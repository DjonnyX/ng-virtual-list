type Dir = 1 | 0 | -1;

export class ScrollingDirection {
    private _values = new Array<Dir>();

    constructor(private _length: number = 5) { }

    add(v: Dir) {
        this._values.push(v);
        while (this._values.length > this._length) {
            this._values.shift();
        }
    }

    get(): Dir {
        let result: number = 0;
        for (const v of this._values) {
            result += v;
        }
        return result === 0 ? 0 : Math.sign(result) as Dir;
    }

    clear() {
        this._values = [];
    }
}