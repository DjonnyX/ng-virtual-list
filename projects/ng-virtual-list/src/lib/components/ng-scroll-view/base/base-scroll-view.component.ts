import {
    Component, computed, DestroyRef, ElementRef, inject, input, Signal, signal, viewChild,
} from '@angular/core';
import { Subject } from 'rxjs';
import { ScrollerDirection, ScrollerDirections } from '../enums';
import { ISize } from '../../../interfaces';
import { SCROLL_VIEW_INVERSION } from '../const';

/**
 * BaseScrollView
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/components/ng-scroll-view/base/base-scroll-view.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'base-scroll-view',
    template: '',
})
export class BaseScrollView {
    readonly scrollContent = viewChild<ElementRef<HTMLDivElement>>('scrollContent');

    readonly scrollViewport = viewChild<ElementRef<HTMLDivElement>>('scrollViewport');

    readonly direction = input<ScrollerDirections>(ScrollerDirection.VERTICAL);

    readonly startOffset = input<number>(0);

    readonly endOffset = input<number>(0);

    readonly isVertical: Signal<boolean>;

    readonly grabbing = signal<boolean>(false);

    protected _$updateScrollBar = new Subject<void>();
    protected $updateScrollBar = this._$updateScrollBar.asObservable();

    get scrollable() {
        const { width, height } = this.viewportBounds(),
            isVertical = this.isVertical(),
            viewportSize = isVertical ? height : width,
            totalSize = this._totalSize;
        return totalSize > viewportSize;
    }

    protected _destroyRef = inject(DestroyRef);

    protected _isMoving = false;
    get isMoving() {
        return this._isMoving;
    }

    protected _x: number = this.startOffset();
    set x(v: number) {
        this._x = this._actualX = v;
    }
    get x() { return this._x; }

    protected _y: number = this.endOffset();
    set y(v: number) {
        this._y = this._actualY = v;
    }
    get y() { return this._y; }

    protected _actualTotalSize: number = 0;
    protected _totalSize: number = 0;
    set totalSize(v: number) {
        if (this._totalSize !== v) {
            this._totalSize = v;
            const startOffset = this.startOffset();
            this._actualTotalSize = v + startOffset;
        }
    }

    get actualScrollHeight() {
        const { height: viewportHeight } = this.viewportBounds(),
            totalSize = this._actualTotalSize,
            isVertical = this.isVertical(),
            startOffset = this.startOffset(),
            endOffset = this.endOffset();
        if (this._inversion) {
            return totalSize > viewportHeight ? isVertical ? endOffset : 0 : viewportHeight - totalSize;
        }
        return totalSize < viewportHeight ? isVertical ? startOffset : 0 : totalSize - viewportHeight;
    }

    get actualScrollWidth() {
        const { width: viewportWidth } = this.viewportBounds(),
            totalSize = this._actualTotalSize,
            isVertical = this.isVertical(),
            startOffset = this.startOffset(),
            endOffset = this.endOffset();
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
        const { width: viewportWidth } = this.viewportBounds(),
            { width: contentWidth } = this.contentBounds(),
            isVertical = this.isVertical(),
            startOffset = this.startOffset(),
            endOffset = this.endOffset();
        if (this._inversion) {
            return contentWidth > viewportWidth ? isVertical ? 0 : endOffset : (viewportWidth - contentWidth);
        }
        return contentWidth < viewportWidth ? isVertical ? 0 : startOffset : (contentWidth - viewportWidth);
    }

    get scrollHeight() {
        const { height: viewportHeight } = this.viewportBounds(),
            { height: contentHeight } = this.contentBounds(),
            isVertical = this.isVertical(),
            startOffset = this.startOffset(),
            endOffset = this.endOffset();
        if (this._inversion) {
            return contentHeight > viewportHeight ? isVertical ? endOffset : 0 : (viewportHeight - contentHeight);
        }
        return contentHeight < viewportHeight ? isVertical ? startOffset : 0 : (contentHeight - viewportHeight);
    }

    readonly viewportBounds = signal<ISize>({ width: 0, height: 0 });

    readonly contentBounds = signal<ISize>({ width: 0, height: 0 });

    protected _inversion = inject(SCROLL_VIEW_INVERSION);

    constructor() {
        this.isVertical = computed(() => {
            return this.direction() === ScrollerDirection.VERTICAL;
        });
    }

    tick() {
        this.onResizeContent();
        this.onResizeViewport();
    }

    protected onResizeViewport() {
        const viewport = this.scrollViewport()?.nativeElement;
        if (viewport) {
            const isVertical = this.isVertical(),
                startOffset = this.startOffset(),
                endOffset = this.endOffset(),
                w = viewport.offsetWidth,
                h = viewport.offsetHeight,
                width = isVertical ? w : w - startOffset - endOffset,
                height = isVertical ? h - startOffset - endOffset : h,
                bounds = this.viewportBounds();
            if (bounds.width === width && bounds.height === height) {
                return;
            }
            this.viewportBounds.set({ width, height });
        }
    }

    protected onResizeContent() {
        const content = this.scrollContent()?.nativeElement;
        if (content) {
            const isVertical = this.isVertical(),
                startOffset = this.startOffset(),
                w = content.offsetWidth,
                h = content.offsetHeight,
                width = isVertical ? w : w - startOffset,
                height = isVertical ? h - startOffset : h,
                bounds = this.contentBounds();
            if (bounds.width === width && bounds.height === height) {
                return;
            }
            this.contentBounds.set({ width, height });
        }
    }
}