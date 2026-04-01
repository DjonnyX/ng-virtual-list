import { IScrollEvent } from "../interfaces";
import { ScrollDirection } from '../types';

interface IScrollEventParams {
    direction: ScrollDirection;
    container: HTMLElement;
    list: HTMLElement;
    delta: number;
    deltaOfNewItems: number;
    scrollSize: number;
    isVertical: boolean;
    itemsRange: [number, number] | undefined;
    isEnd: boolean;
    userAction: boolean;
}

/**
 * Scroll event.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/utils/scroll-event.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
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

    private _deltaOfNewItems: number = 0;
    get deltaOfNewItems() { return this._deltaOfNewItems; }

    private _itemsRange: [number, number] | undefined;
    get itemsRange() { return this._itemsRange; }

    private _userAction: boolean;
    get userAction() { return this._userAction; }

    constructor(params: IScrollEventParams) {
        const { direction, container, list, scrollSize, delta, isVertical, deltaOfNewItems, itemsRange, isEnd, userAction } = params;
        this._direction = direction;
        this._isVertical = isVertical;
        this._scrollSize = scrollSize;
        this._scrollWeight = isVertical ? container.scrollHeight : container.scrollWidth;
        this._listSize = isVertical ? list.offsetHeight : list.offsetWidth;
        this._size = isVertical ? container.offsetHeight : container.offsetWidth;
        this._isEnd = isEnd;
        this._delta = delta;
        this._deltaOfNewItems = deltaOfNewItems;
        this._isStart = this._scrollSize === 0;
        this._itemsRange = itemsRange;
        this._userAction = userAction;
    }
}