import {
    Component, computed, DestroyRef, ElementRef, inject, input, OnDestroy, Signal, signal, viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, Subject, tap } from 'rxjs';
import { ScrollerDirection, ScrollerDirections } from '../enums';
import { ISize } from '../../../types';
import { SCROLL_VIEW_INVERSION } from '../const';

/**
 * BaseScrollView
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-scroll-view/base/base-scroll-view.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'base-scroll-view',
    template: '',
})
export class BaseScrollView implements OnDestroy {
    scrollContent = viewChild<ElementRef<HTMLDivElement>>('scrollContent');

    scrollViewport = viewChild<ElementRef<HTMLDivElement>>('scrollViewport');

    direction = input<ScrollerDirections>(ScrollerDirection.VERTICAL);

    isVertical: Signal<boolean>;

    grabbing = signal<boolean>(false);

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

    protected _x: number = 0;
    set x(v: number) {
        this._x = this._actualX = v;
    }
    get x() { return this._x; }

    protected _y: number = 0;
    set y(v: number) {
        this._y = this._actualY = v;
    }
    get y() { return this._y; }

    protected _totalSize: number = 0;
    set totalSize(v: number) {
        this._totalSize = v;
    }

    get actualScrollHeight() {
        const { height: viewportHeight } = this.viewportBounds(),
            totalSize = this._totalSize;
        if (this._inversion) {
            return totalSize > viewportHeight ? 0 : viewportHeight - totalSize;
        }
        return totalSize < viewportHeight ? 0 : totalSize - viewportHeight;
    }

    get actualScrollWidth() {
        const { width: viewportWidth } = this.viewportBounds(),
            totalSize = this._totalSize;
        if (this._inversion) {
            return totalSize > viewportWidth ? 0 : viewportWidth - totalSize;
        }
        return totalSize < viewportWidth ? 0 : totalSize - viewportWidth;
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
            actualViewportWidth = viewportWidth,
            { width: contentWidth } = this.contentBounds();
        if (this._inversion) {
            return contentWidth > actualViewportWidth ? 0 : (actualViewportWidth - contentWidth);
        }
        return contentWidth < actualViewportWidth ? 0 : (contentWidth - actualViewportWidth);
    }

    get scrollHeight() {
        const { height: viewportHeight } = this.viewportBounds(),
            actualViewportHeight = viewportHeight,
            { height: contentHeight } = this.contentBounds();
        if (this._inversion) {
            return contentHeight > actualViewportHeight ? 0 : (actualViewportHeight - contentHeight);
        }
        return contentHeight < actualViewportHeight ? 0 : (contentHeight - actualViewportHeight);
    }

    readonly viewportBounds = signal<ISize>({ width: 0, height: 0 });

    readonly contentBounds = signal<ISize>({ width: 0, height: 0 });

    protected _viewportResizeObserver: ResizeObserver;

    protected _onResizeViewportHandler = () => {
        const viewport = this.scrollViewport()?.nativeElement;
        if (viewport) {
            this.viewportBounds.set({ width: viewport.offsetWidth, height: viewport.offsetHeight });
        }
    }

    protected _contentResizeObserver: ResizeObserver;

    protected _onResizeContentHandler = () => {
        const content = this.scrollContent()?.nativeElement;
        if (content) {
            this.contentBounds.set({ width: content.offsetWidth, height: content.offsetHeight });
        }
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

    ngOnDestroy(): void {
        if (this._viewportResizeObserver) {
            this._viewportResizeObserver.disconnect();
        }
        if (this._contentResizeObserver) {
            this._contentResizeObserver.disconnect();
        }
    }
}