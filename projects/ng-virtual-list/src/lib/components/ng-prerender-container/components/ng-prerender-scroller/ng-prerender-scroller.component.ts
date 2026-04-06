import { ChangeDetectionStrategy, Component, Input, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, from, takeUntil, tap } from 'rxjs';
import { TextDirection, TextDirections } from '../../../../enums';
import { BaseScrollView } from '../../../ng-scroll-view/base/base-scroll-view.component';
import { SCROLL_VIEW_INVERSION } from '../../../ng-scroll-view';
import { BEHAVIOR_INSTANT, DEFAULT_SCROLLBAR_ENABLED, LEFT_PROP_NAME, TOP_PROP_NAME } from '../../../../const';
import { NgScrollBarComponent } from '../../../ng-scroll-bar/ng-scroll-bar.component';
import { ScrollBox } from '../../../scroller/utils';
import { SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO } from '../../../ng-scroll-view/const';

/**
 * PrerenderScrollerComponent.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/components/prerender-container/prerender-scroller/prerender-scroller.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'ng-prerender-scroller',
    templateUrl: './ng-prerender-scroller.component.html',
    styleUrls: ['../../../scroller/ng-scroller.component.scss'],
    providers: [
        { provide: SCROLL_VIEW_INVERSION, useValue: false },
        { provide: SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, useValue: true },
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgPrerenderScrollerComponent extends BaseScrollView {
    @ViewChild('scrollBar', { read: NgScrollBarComponent })
    scrollBar: NgScrollBarComponent | undefined;

    protected _$langTextDir = new BehaviorSubject<TextDirection>(TextDirections.LTR);
    readonly $langTextDir = this._$langTextDir.asObservable();

    protected _$scrollbarEnabled = new BehaviorSubject<boolean>(DEFAULT_SCROLLBAR_ENABLED);
    readonly $scrollbarEnabled = this._$scrollbarEnabled.asObservable();
    @Input()
    set scrollbarEnabled(v: boolean) {
        if (this._$scrollbarEnabled.getValue() !== v) {
            this._$scrollbarEnabled.next(v);
        }
    }
    get scrollbarEnabled() { return this._$scrollbarEnabled.getValue(); }

    protected _$classes = new BehaviorSubject<{ [cName: string]: boolean }>({});
    readonly $classes = this._$classes.asObservable();
    @Input()
    set classes(v: { [cName: string]: boolean }) {
        if (this._$classes.getValue() !== v) {
            this._$classes.next(v);
        }
    }
    get classes() { return this._$classes.getValue(); }

    protected _$actualClasses = new BehaviorSubject<{ [cName: string]: boolean }>({});
    readonly $actualClasses = this._$actualClasses.asObservable();

    protected _$containerClasses = new BehaviorSubject<{ [cName: string]: boolean }>({});
    readonly $containerClasses = this._$containerClasses.asObservable();

    protected _$thumbSize = new BehaviorSubject<number>(0);
    readonly $thumbSize = this._$thumbSize.asObservable();

    protected _$scrollbarShow = new BehaviorSubject<boolean>(false);
    readonly $scrollbarShow = this._$scrollbarShow.asObservable();

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
        const viewport = this.scrollViewport?.nativeElement;
        if (viewport) {
            this._$viewportBounds.next({ width: viewport.offsetWidth, height: viewport.offsetHeight });
            this.updateScrollBar();
        }
    }

    protected override onResizeContent() {
        const content = this.scrollContent?.nativeElement;
        if (content) {
            this._$contentBounds.next({ width: content.offsetWidth, height: content.offsetHeight });
            this.updateScrollBar();
        }
    }

    private _scrollBox = new ScrollBox();

    constructor() {
        super();

        const $classes = this.$classes,
            $direction = this.$direction;

        combineLatest(([$classes, $direction])).pipe(
            takeUntil(this._$unsubscribe),
            tap(([classes, direction]) => {
                this._$actualClasses.next({ ...classes, [direction]: true });
            }),
        ).subscribe();

        const $contentBounds = this.$contentBounds,
            $viewportBounds = this.$viewportBounds,
            $isVertical = this.$isVertical,
            $scrollbarEnabled = this.$scrollbarEnabled;

        combineLatest([$direction, $scrollbarEnabled, $isVertical, $contentBounds, $viewportBounds]).pipe(
            takeUntil(this._$unsubscribe),
            tap(([direction, scrollbarEnabled]) => {
                this._$containerClasses.next({ [direction]: true, enabled: scrollbarEnabled, scrollable: scrollbarEnabled });
            }),
        ).subscribe();

        const $startOffset = this.$startOffset,
            $endOffset = this.$endOffset,
            $thumbSize = this.$thumbSize;

        from([$endOffset, $startOffset, $thumbSize, $isVertical]).pipe(
            takeUntil(this._$unsubscribe),
            tap(() => {
                this.updateScrollBar();
            }),
        ).subscribe();

        const $updateScrollBar = this.$updateScrollBar;

        $updateScrollBar.pipe(
            takeUntil(this._$unsubscribe),
            tap(() => {
                this.updateScrollBarHandler(true);
            }),
        ).subscribe();
    }

    private updateScrollBarHandler(update: boolean = false) {
        const direction = this._$direction.getValue(),
            isVertical = this._$isVertical.getValue(),
            startOffset = this._$startOffset.getValue(),
            endOffset = this._$endOffset.getValue(),
            scrollContent = this.scrollContent?.nativeElement as HTMLElement,
            scrollViewport = this.scrollViewport?.nativeElement as HTMLDivElement,
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

        this._$thumbSize.next(thumbSize);
        if (update) {
            this.scrollBar?.scroll({
                [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: thumbPosition, fireUpdate: false, behavior: BEHAVIOR_INSTANT,
                userAction: false, blending: true,
            });
        }
        this._$scrollbarShow.next(this.scrollable);
    }

    protected updateScrollBar() {
        this._$updateScrollBar.next();
    }
}
