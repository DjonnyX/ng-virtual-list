import { IScrollEvent, ScrollDirection } from "../models"

export class ScrollEvent implements IScrollEvent {
    private _direction: ScrollDirection = 1;
    get direction() { return this._direction; }

    private _scrollSize: number = 0;
    get scrollSize() { return this._scrollSize; }

    private _scrollWeight: number = 0;
    get scrollWeight() { return this._scrollWeight; }

    private _isVertical: boolean = true;
    get isVertical() { return this._isVertical; }

    private _listSize: number = 0;
    get listSize() { return this._listSize; }

    private _size: number = 0;
    get size() { return this._size; }

    private _isStart: boolean = true;
    get isStart() { return this._isStart; }

    private _isEnd: boolean = false;
    get isEnd() { return this._isEnd; }

    private _delta: number = 0;
    get delta() { return this._delta; }

    constructor(direction: ScrollDirection, container: HTMLElement, list: HTMLElement, delta: number, isVertical: boolean) {
        this._direction = direction;
        this._isVertical = isVertical;
        this._scrollSize = isVertical ? container.scrollTop : container.scrollLeft;
        this._scrollWeight = isVertical ? container.scrollHeight : container.scrollWidth;
        this._listSize = isVertical ? list.offsetHeight : list.offsetWidth;
        this._size = isVertical ? container.offsetHeight : container.offsetWidth;
        this._isEnd = (this._scrollSize + this._size) === this._scrollWeight;
        this._delta = delta;
        this._isStart = this._scrollSize === 0;
    }
}