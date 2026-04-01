import {
    Component, computed, DestroyRef, ElementRef, inject, input, OnDestroy, Signal, signal, viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, Subject, tap } from 'rxjs';
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
export class BaseScrollView implements OnDestroy {
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

    protected _viewportResizeObserver: ResizeObserver;

    protected _onResizeViewportHandler = () => {
        const viewport = this.scrollViewport()?.nativeElement;
        if (viewport) {
            const isVertical = this.isVertical(),
                startOffset = this.startOffset(),
                endOffset = this.endOffset();
            this.viewportBounds.set({
                width: isVertical ? viewport.offsetWidth : viewport.offsetWidth - startOffset - endOffset,
                height: isVertical ? viewport.offsetHeight - startOffset - endOffset : viewport.offsetHeight
            });
        }
        this.onResizeViewport();
    }

    protected _contentResizeObserver: ResizeObserver;

    protected _onResizeContentHandler = () => {
        const content = this.scrollContent()?.nativeElement;
        if (content) {
            const isVertical = this.isVertical(),
                startOffset = this.startOffset();
            this.contentBounds.set({
                width:
                    isVertical ? content.offsetWidth : content.offsetWidth - startOffset,
                height: isVertical ? content.offsetHeight - startOffset : content.offsetHeight,
            });
        }
        this.onResizeContent();
    }

    protected _inversion = inject(SCROLL_VIEW_INVERSION);

    constructor() {
        this._viewportResizeObserver = new ResizeObserver(this._onResizeViewportHandler);
        this._contentResizeObserver = new ResizeObserver(this._onResizeContentHandler);

        this.isVertical = computed(() => {
            return this.direction() === ScrollerDirection.VERTICAL;
        });

        const $viewport = toObservable(this.scrollViewport).pipe(
            takeUntilDestroyed(this._destroyRef),
            filter(v => !!v),
            map(v => v.nativeElement),
        ), $content = toObservable(this.scrollContent).pipe(
            takeUntilDestroyed(this._destroyRef),
            filter(v => !!v),
            map(v => v.nativeElement),
        );

        $viewport.pipe(
            takeUntilDestroyed(this._destroyRef),
            tap(viewport => {
                this._viewportResizeObserver.observe(viewport);
                this._onResizeViewportHandler();
            }),
        ).subscribe();

        $content.pipe(
            takeUntilDestroyed(this._destroyRef),
            tap(content => {
                this._contentResizeObserver.observe(content);
                this._onResizeContentHandler();
            }),
        ).subscribe();
    }

    protected onResizeViewport() { }

    protected onResizeContent() { }

    ngOnDestroy(): void {
        if (this._viewportResizeObserver) {
            this._viewportResizeObserver.disconnect();
        }
        if (this._contentResizeObserver) {
            this._contentResizeObserver.disconnect();
        }
    }
}