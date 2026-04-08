import {
    Component, ElementRef, inject, Input, ViewChild,
} from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Subject, takeUntil, tap } from 'rxjs';
import { ScrollerDirection, ScrollerDirections } from '../enums';
import { ISize } from '../../../interfaces';
import { SCROLL_VIEW_INVERSION } from '../const';
import { DisposableComponent } from '../../../utils/disposable-component';

/**
 * BaseScrollView
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/components/ng-scroll-view/base/base-scroll-view.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'base-scroll-view',
    template: '',
})
export class BaseScrollView extends DisposableComponent {
    @ViewChild('scrollContent')
    scrollContent: ElementRef<HTMLDivElement> | undefined;

    @ViewChild('scrollViewport')
    scrollViewport: ElementRef<HTMLDivElement> | undefined;

    protected _$direction = new BehaviorSubject<ScrollerDirections>(ScrollerDirection.VERTICAL);
    readonly $direction = this._$direction.asObservable();
    @Input()
    set direction(v: ScrollerDirections) {
        if (this._$direction.getValue() !== v) {
            this._$direction.next(v);
        }
    }
    get direction() { return this._$direction.getValue(); }

    protected _$isVertical = new BehaviorSubject<boolean>(true);
    readonly $isVertical = this._$isVertical.asObservable();

    protected _$startOffset = new BehaviorSubject<number>(0);
    readonly $startOffset = this._$startOffset.asObservable();
    @Input()
    set startOffset(v: number) {
        if (this._$startOffset.getValue() !== v) {
            this._$startOffset.next(v);
        }
    }
    get startOffset() { return this._$startOffset.getValue(); }

    protected _$endOffset = new BehaviorSubject<number>(0);
    readonly $endOffset = this._$endOffset.asObservable();
    @Input()
    set endOffset(v: number) {
        if (this._$endOffset.getValue() !== v) {
            this._$endOffset.next(v);
        }
    }
    get direcendOffsettion() { return this._$endOffset.getValue(); }

    protected _$grabbing = new BehaviorSubject<boolean>(false);
    readonly $grabbing = this._$grabbing.asObservable();

    protected _$updateScrollBar = new Subject<void>();
    protected $updateScrollBar = this._$updateScrollBar.asObservable();

    get scrollable() {
        const { width, height } = this._$viewportBounds.getValue(),
            isVertical = this._$isVertical.getValue(),
            viewportSize = isVertical ? height : width,
            totalSize = this._totalSize;
        return totalSize > viewportSize;
    }

    protected _isMoving = false;
    get isMoving() {
        return this._isMoving;
    }

    protected _x: number = this._$startOffset.getValue();
    set x(v: number) {
        this._x = this._actualX = v;
    }
    get x() { return this._x; }

    protected _y: number = this._$endOffset.getValue();
    set y(v: number) {
        this._y = this._actualY = v;
    }
    get y() { return this._y; }

    protected _actualTotalSize: number = 0;
    protected _totalSize: number = 0;
    set totalSize(v: number) {
        if (this._totalSize !== v) {
            this._totalSize = v;
            const startOffset = this._$startOffset.getValue();
            this._actualTotalSize = v + startOffset;
        }
    }

    get actualScrollHeight() {
        const { height: viewportHeight } = this._$viewportBounds.getValue(),
            totalSize = this._actualTotalSize,
            isVertical = this._$isVertical.getValue(),
            startOffset = this._$startOffset.getValue(),
            endOffset = this._$endOffset.getValue();
        if (this._inversion) {
            return totalSize > viewportHeight ? isVertical ? endOffset : 0 : viewportHeight - totalSize;
        }
        return totalSize < viewportHeight ? isVertical ? startOffset : 0 : totalSize - viewportHeight;
    }

    get actualScrollWidth() {
        const { width: viewportWidth } = this._$viewportBounds.getValue(),
            totalSize = this._actualTotalSize,
            isVertical = this._$isVertical.getValue(),
            startOffset = this._$startOffset.getValue(),
            endOffset = this._$endOffset.getValue();
        if (this._inversion) {
            return totalSize > viewportWidth ? isVertical ? 0 : endOffset : viewportWidth - totalSize;
        }
        return totalSize < viewportWidth ? isVertical ? 0 : startOffset : totalSize - viewportWidth;
    }

    protected _actualX: number = 0;
    get actualScrollLeft() {
        return this._actualX;
    }

    protected _actualY: number = 0;
    get actualScrollTop() {
        return this._actualY;
    }

    get scrollLeft() {
        return this._x;
    }

    get scrollTop() {
        return this._y;
    }

    get scrollWidth() {
        const { width: viewportWidth } = this._$viewportBounds.getValue(),
            { width: contentWidth } = this._$contentBounds.getValue(),
            isVertical = this._$isVertical.getValue(),
            startOffset = this._$startOffset.getValue(),
            endOffset = this._$endOffset.getValue();
        if (this._inversion) {
            return contentWidth > viewportWidth ? isVertical ? 0 : endOffset : (viewportWidth - contentWidth);
        }
        return contentWidth < viewportWidth ? isVertical ? 0 : startOffset : (contentWidth - viewportWidth);
    }

    get scrollHeight() {
        const { height: viewportHeight } = this._$viewportBounds.getValue(),
            { height: contentHeight } = this._$contentBounds.getValue(),
            isVertical = this._$isVertical.getValue(),
            startOffset = this._$startOffset.getValue(),
            endOffset = this._$endOffset.getValue();
        if (this._inversion) {
            return contentHeight > viewportHeight ? isVertical ? endOffset : 0 : (viewportHeight - contentHeight);
        }
        return contentHeight < viewportHeight ? isVertical ? startOffset : 0 : (contentHeight - viewportHeight);
    }

    protected _$viewportBounds = new BehaviorSubject<ISize>({ width: 0, height: 0 });
    readonly $viewportBounds = this._$viewportBounds.asObservable();

    protected _$contentBounds = new BehaviorSubject<ISize>({ width: 0, height: 0 });
    readonly $contentBounds = this._$contentBounds.asObservable();


    protected _inversion = inject(SCROLL_VIEW_INVERSION);

    constructor() {
        super();

        const $direction = this.$direction;
        $direction.pipe(
            takeUntil(this._$unsubscribe),
            distinctUntilChanged(),
            tap(v => {
                this._$isVertical.next(v === ScrollerDirection.VERTICAL);
            }),
        ).subscribe();
    }

    tick() {
        this.onResizeContent();
        this.onResizeViewport();
    }

    protected onResizeViewport() {
        const viewport = this.scrollViewport?.nativeElement;
        if (viewport) {
            const isVertical = this._$isVertical.getValue(),
                startOffset = this._$startOffset.getValue(),
                endOffset = this._$endOffset.getValue(),
                w = viewport.offsetWidth,
                h = viewport.offsetHeight,
                width = isVertical ? w : w - startOffset - endOffset,
                height = isVertical ? h - startOffset - endOffset : h,
                bounds = this._$viewportBounds.getValue();
            if (bounds.width === width && bounds.height === height) {
                return;
            }
            this._$viewportBounds.next({ width, height });
        }
    }

    protected onResizeContent() {
        const content = this.scrollContent?.nativeElement;
        if (content) {
            const isVertical = this._$isVertical.getValue(),
                startOffset = this._$startOffset.getValue(),
                w = content.offsetWidth,
                h = content.offsetHeight,
                width = isVertical ? w : w - startOffset,
                height = isVertical ? h - startOffset : h,
                bounds = this._$contentBounds.getValue();
            if (bounds.width === width && bounds.height === height) {
                return;
            }
            this._$contentBounds.next({ width, height });
        }
    }
}