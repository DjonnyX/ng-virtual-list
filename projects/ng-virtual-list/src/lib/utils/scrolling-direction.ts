import { BehaviorSubject } from "rxjs";
import { ScrollDirection } from "../types";

/**
 * ScrollingDirection
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/scrolling-direction.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class ScrollingDirection {
    private _value: number = 0;

    private _$direction = new BehaviorSubject<ScrollDirection>(0);
    readonly $direction = this._$direction.asObservable();

    constructor(private _length: number = 5) { }

    add(v: ScrollDirection) {
        this._value += v;
        const dir = this._value < this._length ? -this._length : this._value > this._length ? this._length : this._value,
            result = dir === 0 ? 0 : Math.sign(dir) as ScrollDirection;
        this._$direction.next(result);
    }

    get(): ScrollDirection {
        return this._$direction.getValue();
    }

    clear() {
        this._value = 0;
    }
}