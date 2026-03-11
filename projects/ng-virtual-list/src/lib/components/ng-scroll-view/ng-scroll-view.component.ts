import { Component, DestroyRef, ElementRef, inject, Input, OnDestroy, ViewChild, } from '@angular/core';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { BehaviorSubject, distinctUntilChanged, filter, fromEvent, map, of, race, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { ScrollerDirection } from './enums';
import { ScrollerDirections } from './enums';
import { ISize } from '../../types';
import { ANIMATOR_MIN_TIMESTAMP, Animator, Easing, easeOutQuad } from '../../utils/animator';
import {
    BEHAVIOR_INSTANT, DEFAULT_OVERSCROLL_ENABLED, DEFAULT_SCROLL_BEHAVIOR, INTERACTIVE, MOUSE_DOWN, MOUSE_MOVE, MOUSE_UP, SCROLLER_SCROLL,
    SCROLLER_SCROLLBAR_SCROLL, SCROLLER_WHEEL, TOUCH_END, TOUCH_MOVE, TOUCH_START, WHEEL,
} from '../../const';
import { IScrollToParams } from './interfaces';
import { SCROLL_VIEW_INVERSION } from './const';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const calculateDirection = (buffer: Array<[number, number]>) => {
    for (let i = buffer.length - 1, l = 0; i >= l; i--) {
        const v = buffer[i];
        if (v[0] === 0) {
            continue;
        }
        return Math.sign(v[0]);
    }
    return 1;
};

const TOP = 'top',
    LEFT = 'left',
    INSTANT = 'instant',
    AUTO = 'auto',
    SMOOTH = 'smooth',
    DURATION = 2000,
    FRICTION_FORCE = .035,
    MAX_DURATION = 4000,
    ANIMATION_DURATION = 50,
    MASS = .005,
    MAX_DIST = 12500,
    MAX_VELOCITY_TIMESTAMP = 100,
    SPEED_SCALE = 5,
    OVERSCROLL_START_ITERATION = 2;

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL),
    WHEEL_EVENT = new Event(SCROLLER_WHEEL),
    SCROLLBAR_SCROLL_EVENT = new Event(SCROLLER_SCROLLBAR_SCROLL);

/**
 * NgScrollView
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/components/scroll-view/scroll-view.directive.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'ng-scroll-view',
    template: '',
})
export class NgScrollView implements OnDestroy {
    @ViewChild('scrollContent')
    scrollContent: ElementRef<HTMLDivElement> | undefined;

    @ViewChild('scrollViewport', { read: CdkScrollable })
    cdkScrollable: CdkScrollable | undefined;

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

    protected _$scrollBehavior = new BehaviorSubject<ScrollBehavior>(DEFAULT_SCROLL_BEHAVIOR);
    readonly $scrollBehavior = this._$scrollBehavior.asObservable();
    @Input()
    set scrollBehavior(v: ScrollBehavior) {
        if (this._$scrollBehavior.getValue() !== v) {
            this._$scrollBehavior.next(v);
        }
    }
    get scrollBehavior() { return this._$scrollBehavior.getValue(); }

    protected _$overscrollEnabled = new BehaviorSubject<boolean>(DEFAULT_OVERSCROLL_ENABLED);
    readonly $overscrollEnabled = this._$overscrollEnabled.asObservable();
    @Input()
    set overscrollEnabled(v: boolean) {
        if (this._$overscrollEnabled.getValue() !== v) {
            this._$overscrollEnabled.next(v);
        }
    }
    get overscrollEnabled() { return this._$overscrollEnabled.getValue(); }

    protected _$isVertical = new BehaviorSubject<boolean>(true);
    readonly $isVertical = this._$isVertical.asObservable();

    protected _$grabbing = new BehaviorSubject<boolean>(false);
    readonly $grabbing = this._$grabbing.asObservable();

    protected _$updateScrollBar = new Subject<void>();
    protected $updateScrollBar = this._$updateScrollBar.asObservable();

    protected _$scroll = new Subject<boolean>();
    readonly $scroll = this._$scroll.asObservable();

    protected _$scrollEnd = new Subject<boolean>();
    readonly $scrollEnd = this._$scrollEnd.asObservable();

    get scrollable() {
        const { width, height } = this._$viewportBounds.getValue(),
            isVertical = this._$isVertical.getValue(),
            viewportSize = isVertical ? height : width,
            totalSize = this._totalSize;
        return totalSize > viewportSize;
    }

    protected _isMoving = false;

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
        if (this._totalSize !== v) {
            this._totalSize = v;
        }
    }
    get totalSize() { return this._totalSize; }

    get actualScrollHeight() {
        const { height: viewportHeight } = this._$viewportBounds.getValue(),
            totalSize = this._totalSize;
        if (this._inversion) {
            return totalSize > viewportHeight ? 0 : viewportHeight - totalSize;
        }
        return totalSize < viewportHeight ? 0 : totalSize - viewportHeight;
    }

    get actualScrollWidth() {
        const { width: viewportWidth } = this._$viewportBounds.getValue(),
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
        const { width: viewportWidth } = this._$viewportBounds.getValue(),
            actualViewportWidth = viewportWidth,
            { width: contentWidth } = this._$contentBounds.getValue();
        if (this._inversion) {
            return contentWidth > actualViewportWidth ? 0 : (actualViewportWidth - contentWidth);
        }
        return contentWidth < actualViewportWidth ? 0 : (contentWidth - actualViewportWidth);
    }

    get scrollHeight() {
        const { height: viewportHeight } = this._$viewportBounds.getValue(),
            actualViewportHeight = viewportHeight,
            { height: contentHeight } = this._$contentBounds.getValue();
        if (this._inversion) {
            return contentHeight > actualViewportHeight ? 0 : (actualViewportHeight - contentHeight);
        }
        return contentHeight < actualViewportHeight ? 0 : (contentHeight - actualViewportHeight);
    }

    protected _velocity: number = 0;

    protected _$viewportBounds = new BehaviorSubject<ISize>({ width: 0, height: 0 });
    readonly $viewportBounds = this._$viewportBounds.asObservable();

    protected _$contentBounds = new BehaviorSubject<ISize>({ width: 0, height: 0 });
    readonly $contentBounds = this._$contentBounds.asObservable();

    protected _viewportResizeObserver: ResizeObserver;

    protected _onResizeViewportHandler = () => {
        const viewport = this.scrollViewport?.nativeElement;
        if (viewport) {
            this._$viewportBounds.next({ width: viewport.offsetWidth, height: viewport.offsetHeight });
        }
    }

    protected _contentResizeObserver: ResizeObserver;

    protected _onResizeContentHandler = () => {
        const content = this.scrollContent?.nativeElement;
        if (!!content) {
            this._$contentBounds.next({ width: content.offsetWidth, height: content.offsetHeight });
        }
    }

    protected _animator = new Animator();

    protected _interactive = true;

    private _inversion = inject(SCROLL_VIEW_INVERSION);

    private _overscrollIteration: number = 0;

    protected _$viewInitialized = new BehaviorSubject<boolean>(false);
    readonly $viewInitialized = this._$viewInitialized.asObservable();

    protected _destroyRef = inject(DestroyRef);

    constructor() {
        this._viewportResizeObserver = new ResizeObserver(this._onResizeViewportHandler);
        this._contentResizeObserver = new ResizeObserver(this._onResizeContentHandler);

        const $direction = this.$direction;
        $direction.pipe(
            takeUntilDestroyed(this._destroyRef),
            distinctUntilChanged(),
            tap(v => {
                this._$isVertical.next(v === ScrollerDirection.VERTICAL);
            }),
        ).subscribe();

        const $viewInitialized = this.$viewInitialized;

        const $viewport = $viewInitialized.pipe(
            takeUntilDestroyed(this._destroyRef),
            filter(v => !!v),
            switchMap(() => of(this.scrollViewport).pipe(
                takeUntilDestroyed(this._destroyRef),
                filter(v => !!v),
                map(v => v!.nativeElement),
            )),
        ), $content = $viewInitialized.pipe(
            takeUntilDestroyed(this._destroyRef),
            filter(v => !!v),
            switchMap(() => of(this.scrollContent).pipe(
                takeUntilDestroyed(this._destroyRef),
                filter(v => !!v),
                map(v => v!.nativeElement),
            )),
        ), $wheelEmitter = this._inversion ? $viewport : $content;

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
        $wheelEmitter.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<WheelEvent>(content, WHEEL, { passive: false }).pipe(
                    filter(v => this._interactive),
                    takeUntilDestroyed(this._destroyRef),
                    tap(e => {
                        const isVertical = this._$isVertical.getValue();
                        if (this.cdkScrollable) {
                            this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(WHEEL_EVENT);
                        }
                        this.checkOverscroll(e);
                        this.stopScrolling();
                        const scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
                            startPos = isVertical ? this.y : this.x,
                            delta = isVertical ? e.deltaY : e.deltaX, dp = (startPos + delta), position = dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp;
                        this.scroll({ [isVertical ? TOP : LEFT]: position, behavior: INSTANT, userAction: true });
                    }),
                );
            }),
        ).subscribe();

        const $mouseUp = fromEvent<MouseEvent>(window, MOUSE_UP, { passive: false }).pipe(
            takeUntilDestroyed(this._destroyRef),
        ),
            $mouseDragCancel = $mouseUp.pipe(
                takeUntilDestroyed(this._destroyRef),
                tap(() => {
                    this._isMoving = false;
                    this._$grabbing.next(false);
                }),
            );

        $content.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<MouseEvent>(content, MOUSE_DOWN, { passive: false }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                    filter(v => this._interactive),
                    switchMap(e => {
                        this.cancelOverscroll();
                        this.onDragStart();
                        this.stopScrolling();
                        const target = e.target as HTMLElement;
                        if (target.classList.contains(INTERACTIVE)) {
                            return of(undefined);
                        }
                        const inversion = this._inversion, isVertical = this._$isVertical.getValue();
                        this._isMoving = true;
                        this._$grabbing.next(true);
                        const startPos = isVertical ? this.y : this.x;
                        let prevClientPosition = 0;
                        const startClientPos = isVertical ? e.clientY : e.clientX,
                            offsets = new Array<[number, number]>(), velocities = new Array<[number, number]>();
                        let startTime = Date.now();
                        return fromEvent<MouseEvent>(window, MOUSE_MOVE, { passive: false }).pipe(
                            takeUntilDestroyed(this._destroyRef),
                            takeUntil($mouseDragCancel),
                            tap(e => {
                                this.checkOverscroll(e);
                            }),
                            switchMap(e => {
                                const currentPos = isVertical ? e.clientY : e.clientX,
                                    scrollSize = isVertical ? this.scrollHeight : this.scrollWidth, delta = (inversion ? -1 : 1) * (startClientPos - currentPos),
                                    dp = startPos + delta, position = Math.round(dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp), endTime = Date.now(),
                                    timestamp = endTime - startTime, scrollDelta = prevClientPosition === 0 ? 0 : prevClientPosition - currentPos,
                                    { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp);
                                this.calculateAcceleration(velocities, v0, timestamp);
                                prevClientPosition = currentPos;
                                this.move(isVertical, position, false, true);
                                startTime = endTime;
                                return race([fromEvent<MouseEvent>(window, MOUSE_UP, { passive: false }), fromEvent<MouseEvent>(content, MOUSE_UP, { passive: false })]).pipe(
                                    takeUntilDestroyed(this._destroyRef),
                                    tap(e => {
                                        this.cancelOverscroll();
                                        const endTime = Date.now(),
                                            timestamp = endTime - startTime,
                                            { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp),
                                            { a0 } = this.calculateAcceleration(velocities, v0, timestamp);
                                        this._isMoving = false;
                                        this._$grabbing.next(false);

                                        if (this._$scrollBehavior.getValue() === BEHAVIOR_INSTANT as ScrollBehavior) {
                                            return;
                                        }

                                        this.moveWithAcceleration(isVertical, position, 0, v0, a0);
                                    }),
                                );
                            }),
                        );
                    })
                );
            }),
        ).subscribe();

        const $touchUp = fromEvent<TouchEvent>(window, TOUCH_END, { passive: false }).pipe(
            takeUntilDestroyed(this._destroyRef),
        ),
            $touchCanceler = $touchUp.pipe(
                takeUntilDestroyed(this._destroyRef),
                tap(() => {
                    this._isMoving = false;
                    this._$grabbing.next(false);
                }),
            );

        $content.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<TouchEvent>(content, TOUCH_START, { passive: false }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                    filter(v => this._interactive),
                    switchMap(e => {
                        this.cancelOverscroll();
                        this.onDragStart();
                        this.stopScrolling();
                        const target = e.target as HTMLElement;
                        if (target.classList.contains(INTERACTIVE)) {
                            return of(undefined);
                        }
                        const inversion = this._inversion, isVertical = this._$isVertical.getValue();
                        this._isMoving = true;
                        this._$grabbing.next(true);
                        const startPos = isVertical ? this.y : this.x;
                        let prevClientPosition = 0;
                        const startClientPos = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX,
                            offsets = new Array<[number, number]>(), velocities = new Array<[number, number]>();
                        let startTime = Date.now();
                        return fromEvent<TouchEvent>(window, TOUCH_MOVE, { passive: false }).pipe(
                            takeUntilDestroyed(this._destroyRef),
                            takeUntil($touchCanceler),
                            tap(e => {
                                this.checkOverscroll(e);
                            }),
                            switchMap(e => {
                                const currentPos = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX,
                                    scrollSize = isVertical ? this.scrollHeight : this.scrollWidth, delta = (inversion ? -1 : 1) * (startClientPos - currentPos),
                                    dp = startPos + delta, position = Math.round(dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp), endTime = Date.now(),
                                    timestamp = endTime - startTime, scrollDelta = prevClientPosition === 0 ? 0 : prevClientPosition - currentPos,
                                    { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp);
                                this.calculateAcceleration(velocities, v0, timestamp);
                                prevClientPosition = currentPos;
                                this.move(isVertical, position, false, true);
                                startTime = endTime;

                                return race([fromEvent<TouchEvent>(window, TOUCH_END, { passive: false }), fromEvent<TouchEvent>(content, TOUCH_END, { passive: false })]).pipe(
                                    takeUntilDestroyed(this._destroyRef),
                                    tap(e => {
                                        this.cancelOverscroll();
                                        const endTime = Date.now(),
                                            timestamp = endTime - startTime,
                                            { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp),
                                            { a0 } = this.calculateAcceleration(velocities, v0, timestamp);
                                        this._isMoving = false;
                                        this._$grabbing.next(false);

                                        if (this._$scrollBehavior.getValue() === BEHAVIOR_INSTANT as ScrollBehavior) {
                                            return;
                                        }

                                        this.moveWithAcceleration(isVertical, position, this._velocity, v0, a0);
                                    }),
                                );
                            }),
                        );
                    })
                );
            }),
        ).subscribe();
    }

    private cancelOverscroll() {
        if (!this._$overscrollEnabled.getValue()) {
            return;
        }
        this._overscrollIteration = 0;
    }

    private checkOverscrollByAxis(e: Event, pos: number, limit: number) {
        const p = Math.abs(pos);
        if (p > 0 && p < limit) {
            if (e.cancelable) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
            if (this._overscrollIteration > 0) {
                this.scrollContent?.nativeElement?.click();
            }
            this._overscrollIteration = 0;
        } else {
            if (this._overscrollIteration < OVERSCROLL_START_ITERATION) {
                this._overscrollIteration++;
                if (e.cancelable) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                }
            }
        }
    }

    private checkOverscroll(e: Event) {
        if (!this._$overscrollEnabled.getValue()) {
            if (e.cancelable) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
            return;
        }
        if (this._$isVertical.getValue()) {
            this.checkOverscrollByAxis(e, this._y, this.scrollHeight);
        } else {
            this.checkOverscrollByAxis(e, this._x, this.scrollWidth);
        }
    }

    private calculateVelocity(offsets: Array<[number, number]>, delta: number, timestamp: number, indexOffset: number = 10) {
        offsets.push([delta, timestamp < ANIMATOR_MIN_TIMESTAMP ? ANIMATOR_MIN_TIMESTAMP : timestamp]);

        const len = offsets.length, startIndex = len > indexOffset ? len - indexOffset : 0, lastVSign = calculateDirection(offsets);
        let vSum = 0;
        for (let i = startIndex, l = offsets.length; i < l; i++) {
            const p0 = offsets[i];
            if (lastVSign !== Math.sign(p0[0])) {
                continue;
            }

            const v0 = (p0[1] !== 0 ? lastVSign * Math.abs(p0[0] / p0[1]) * SPEED_SCALE : 0);
            vSum += Math.sign(v0) * Math.pow(v0, 4) * .003;
        }

        const l = Math.min(offsets.length, indexOffset), v0 = l > 0 ? (vSum / l) : 0;
        return { v0 };
    }

    private calculateAcceleration(velocities: Array<[number, number]>, delta: number, timestamp: number, indexOffset: number = 10) {
        velocities.push([delta, timestamp < ANIMATOR_MIN_TIMESTAMP ? ANIMATOR_MIN_TIMESTAMP : timestamp]);
        const len = velocities.length, startIndex = len > indexOffset ? len - indexOffset : 0;
        let aSum = 0, prevV0: [number, number] | undefined, iteration = 0, lastVSign = calculateDirection(velocities);
        for (let i = startIndex, l = velocities.length; i < l; i++) {
            const v00 = prevV0, v01 = velocities[i];
            if (lastVSign !== Math.sign(v01[0])) {
                continue;
            }
            if (v00) {
                const a0 = timestamp < MAX_VELOCITY_TIMESTAMP ? (v00[1] !== 0 ? (lastVSign * Math.abs(Math.abs(v01[0]) - Math.abs(v00[0]))) / Math.abs(v00[1]) : 0) : 0;
                aSum += a0;
                prevV0 = v01;
            }
            prevV0 = v01;
            iteration++;
        }

        const a0 = aSum * FRICTION_FORCE;
        return { a0 };
    }

    stopScrolling() {
        this._animator.stop();
    }

    protected move(isVertical: boolean, position: number, blending: boolean = false, userAction: boolean = false, fireUpdate: boolean = true) {
        this.scroll({ [isVertical ? TOP : LEFT]: position, behavior: INSTANT, blending, userAction, fireUpdate });
    }

    protected moveWithAcceleration(isVertical: boolean, position: number, v0: number, v: number, a0: number) {
        if (a0 !== 0) {
            const dvSign = Math.sign(v),
                duration = DURATION, maxDuration = MAX_DURATION,
                maxDistance = dvSign * MAX_DIST, s = (dvSign * Math.abs((a0 * Math.pow(duration, 2)) * .5) / 1000) / MASS,
                distance = Math.abs(s) < MAX_DIST ? s : maxDistance, positionWithVelocity = position + (this._inversion ? -1 : 1) * distance,
                vmax = Math.max(Math.abs(v0), Math.abs(v)),
                ad = Math.abs(vmax !== 0 ? Math.sqrt(vmax) : 0) * 10 / MASS,
                aDuration = ad < maxDuration ? ad : maxDuration,
                startPosition = isVertical ? this.y : this.x;
            this.animate(startPosition, Math.round(positionWithVelocity), aDuration, easeOutQuad, true);
        }
    }

    protected normalizeAnimatedValue(value: number) {
        const isVertical = this._$direction.getValue() === ScrollerDirection.VERTICAL,
            scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
            result = value < 0 ? 0 : value > scrollSize ? scrollSize : value;
        return result;
    }

    protected animate(startValue: number, endValue: number, duration = ANIMATION_DURATION, easingFunction: Easing = easeOutQuad,
        userAction: boolean = false) {
        const isVertical = this._$direction.getValue() === ScrollerDirection.VERTICAL;
        this._animator.animate({
            startValue, endValue, duration,
            easingFunction,
            getPropValue: () => {
                return isVertical ? this._y : this._x;
            }, onUpdate: ({ value }) => {
                this.move(isVertical, value, false, userAction);
            }, onComplete: ({ value }) => {
                this.move(isVertical, value, false, userAction);
                this._$scrollEnd.next(userAction);
            },
        });
    }

    fireScroll(userAction: boolean = false) {
        this.stopScrolling();
        this._$updateScrollBar.next();
        if (this.cdkScrollable) {
            this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLL_EVENT);
        }
        this.fireScrollEvent(userAction);
    }

    scrollLimits(value?: number | undefined): boolean {
        const x = value !== undefined ? value : this._x, y = value !== undefined ? value : this._y, isVertical = this._$isVertical.getValue();
        if (isVertical) {
            const yy = this.normalizeAnimatedValue(y);
            if (y !== yy) {
                this.y = yy;
                return true;
            }
        } else {
            const xx = this.normalizeAnimatedValue(x);
            if (x !== xx) {
                this.x = xx;
                return true;
            }
        }
        return false;
    }

    scroll(params: IScrollToParams) {
        const posX = params.x || params.left || 0,
            posY = params.y || params.top || 0,
            userAction = params.userAction ?? false,
            ease = params.ease || easeOutQuad,
            fireUpdate = params.fireUpdate ?? true,
            behavior = params.behavior ?? INSTANT,
            blending = params.blending ?? true,
            duration = params.duration ?? ANIMATION_DURATION,
            isVertical = this._$direction.getValue() === ScrollerDirection.VERTICAL;

        const limits = this.scrollLimits(),
            x = this.normalizeAnimatedValue(limits ? this._x : posX),
            y = this.normalizeAnimatedValue(limits ? this._y : posY),
            xx = x,
            yy = y,
            prevX = this._x,
            prevY = this._y;
        if (behavior === AUTO || behavior === SMOOTH) {
            if (isVertical) {
                if (prevY !== yy) {
                    this.animate(prevY, yy, duration, ease, userAction);
                }
            } else {
                if (prevX !== xx) {
                    this.animate(prevX, xx, duration, ease, userAction);
                }
            }
        } else {
            if (!limits) {
                this.x = xx;
                this.y = yy;
            }
            if (isVertical) {
                if (prevY !== yy) {
                    if (!blending) {
                        this.stopScrolling();
                    }
                    this.refreshY(yy);
                    if (this.cdkScrollable) {
                        this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLL_EVENT);
                    }

                    if (fireUpdate) {
                        this.fireScrollEvent(userAction);
                    }
                }
            } else {
                if (prevX !== xx) {
                    if (!blending) {
                        this.stopScrolling();
                    }
                    this.refreshX(xx);
                    if (this.cdkScrollable) {
                        this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLL_EVENT);
                    }

                    if (fireUpdate) {
                        this.fireScrollEvent(userAction);
                    }
                }
            }
        }
    }

    refreshX(value: number) {
        const scrollContent = this.scrollContent?.nativeElement as HTMLDivElement;
        scrollContent.style.transform = `translate3d(${(this._inversion ? 1 : -1) * value}px, 0, 0)`;
    }

    refreshY(value: number) {
        const scrollContent = this.scrollContent?.nativeElement as HTMLDivElement;
        scrollContent.style.transform = `translate3d(0, ${(this._inversion ? 1 : -1) * value}px, 0)`;
    }

    protected fireScrollEvent(userAction: boolean) {
        this._$scroll.next(userAction);
    }

    protected onDragStart() { }

    reset(offset: number = 0) {
        this.stopScrolling();
        this.move(this._$isVertical.getValue(), offset);
    }

    ngAfterViewInit(): void {
        this.afterViewInit();
    }

    private afterViewInit() {
        this._$viewInitialized.next(true);
    }

    ngOnDestroy(): void {
        if (this._animator) {
            this._animator.dispose();
        }
        if (this._viewportResizeObserver) {
            this._viewportResizeObserver.disconnect();
        }
        if (this._contentResizeObserver) {
            this._contentResizeObserver.disconnect();
        }
    }
}