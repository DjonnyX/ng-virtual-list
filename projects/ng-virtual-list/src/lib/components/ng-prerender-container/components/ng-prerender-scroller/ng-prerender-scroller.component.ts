import { ChangeDetectionStrategy, Component, computed, input, Signal, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, from, tap } from 'rxjs';
import { TextDirection, TextDirections } from '../../../../enums';
import { BaseScrollView } from '../../../ng-scroll-view/base/base-scroll-view.component';
import { SCROLL_VIEW_INVERSION } from '../../../ng-scroll-view';
import { BEHAVIOR_INSTANT, DEFAULT_SCROLLBAR_ENABLED, LEFT_PROP_NAME, TOP_PROP_NAME } from '../../../../const';
import { NgScrollBarComponent } from '../../../ng-scroll-bar/ng-scroll-bar.component';
import { ScrollBox } from '../../../ng-scroller/utils';
import { SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO } from '../../../ng-scroll-view/const';

/**
 * PrerenderScrollerComponent.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/components/prerender-container/prerender-scroller/prerender-scroller.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'ng-prerender-scroller',
    templateUrl: './ng-prerender-scroller.component.html',
    styleUrl: '../../../ng-scroller/ng-scroller.component.scss',
    providers: [
        { provide: SCROLL_VIEW_INVERSION, useValue: false },
        { provide: SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, useValue: true },
    ],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgPrerenderScrollerComponent extends BaseScrollView {
    @ViewChild('scrollBar', { read: NgScrollBarComponent })
    scrollBar: NgScrollBarComponent | undefined;

    langTextDir = signal<TextDirection>(TextDirections.LTR);

    scrollbarEnabled = input<boolean>(DEFAULT_SCROLLBAR_ENABLED);

    classes = input<{ [cName: string]: boolean }>({});

    actualClasses: Signal<{ [cName: string]: boolean }>;

    containerClasses = signal<{ [cName: string]: boolean }>({});

    thumbSize = signal<number>(0);

    scrollbarShow = signal<boolean>(false);

    override set x(v: number) {
        if (v !== undefined && !Number.isNaN(v)) {
            this._x = this._actualX = v;

            this.updateScrollBar();
        }
    }
    override get x() { return this._x; }

    override set y(v: number) {
        if (v !== undefined && !Number.isNaN(v)) {
            this._y = this._actualY = v;

            this.updateScrollBar();
        }
    }
    override get y() { return this._y; }

    protected override onResizeViewport() {
        const viewport = this.scrollViewport()?.nativeElement;
        if (viewport) {
            this.viewportBounds.set({ width: viewport.offsetWidth, height: viewport.offsetHeight });
            this.updateScrollBar();
        }
    }

    protected override onResizeContent() {
        const content = this.scrollContent()?.nativeElement;
        if (content) {
            this.contentBounds.set({ width: content.offsetWidth, height: content.offsetHeight });
            this.updateScrollBar();
        }
    }

    private _scrollBox = new ScrollBox();

    constructor() {
        super();

        this.actualClasses = computed(() => {
            const classes = this.classes(), direction = this.direction();
            return { ...classes, [direction]: true };
        });

        const $contentBounds = toObservable(this.contentBounds),
            $viewportBounds = toObservable(this.viewportBounds),
            $isVertical = toObservable(this.isVertical),
            $direction = toObservable(this.direction),
            $scrollbarEnabled = toObservable(this.scrollbarEnabled);

        combineLatest([$direction, $scrollbarEnabled, $isVertical, $contentBounds, $viewportBounds]).pipe(
            takeUntilDestroyed(),
            tap(([direction, scrollbarEnabled]) => {
                this.containerClasses.set({ [direction]: true, enabled: scrollbarEnabled, scrollable: scrollbarEnabled });
            }),
        ).subscribe();

        const $startOffset = toObservable(this.startOffset),
            $endOffset = toObservable(this.endOffset),
            $thumbSize = toObservable(this.thumbSize);

        from([$endOffset, $startOffset, $thumbSize, $isVertical]).pipe(
            takeUntilDestroyed(),
            tap(() => {
                this.updateScrollBar();
            }),
        ).subscribe();

        const $updateScrollBar = this.$updateScrollBar;

        $updateScrollBar.pipe(
            takeUntilDestroyed(this._destroyRef),
            tap(() => {
                this.updateScrollBarHandler(true);
            }),
        ).subscribe();
    }

    private updateScrollBarHandler(update: boolean = false) {
        const direction = this.direction(),
            isVertical = this.isVertical(),
            startOffset = this.startOffset(),
            endOffset = this.endOffset(),
            scrollContent = this.scrollContent()?.nativeElement as HTMLElement,
            scrollViewport = this.scrollViewport()?.nativeElement as HTMLDivElement,
            {
                thumbSize,
                thumbPosition,
            } = this._scrollBox.calculateScroll({
                direction,
                viewportWidth: scrollViewport.offsetWidth, viewportHeight: scrollViewport.offsetHeight,
                contentWidth: scrollContent.offsetWidth, contentHeight: scrollContent.offsetHeight,
                startOffset,
                endOffset,
                positionX: this._x,
                positionY: this._y,
                minSize: 1,
            });

        this.thumbSize.set(thumbSize);
        if (update) {
            this.scrollBar?.scroll({
                [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: thumbPosition, fireUpdate: false, behavior: BEHAVIOR_INSTANT,
                userAction: false, blending: true,
            });
        }
        this.scrollbarShow.set(this.scrollable);
    }

    protected updateScrollBar() {
        this._$updateScrollBar.next();
    }
}