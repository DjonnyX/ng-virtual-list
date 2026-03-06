import { Component, computed, DestroyRef, ElementRef, inject, input, OnDestroy, Signal, signal, ViewChild, viewChild } from '@angular/core';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, fromEvent, map, of, race, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { ScrollerDirection } from './enums';
import { ScrollerDirections } from './enums';
import { ISize } from '../../types';
import { ANIMATOR_MIN_TIMESTAMP, Animator, Easing, easeOutQuad } from '../../utils/animator';
import {
    INTERACTIVE, MOUSE_DOWN, MOUSE_MOVE, MOUSE_UP, SCROLLER_SCROLL, SCROLLER_SCROLLBAR_SCROLL, SCROLLER_WHEEL, TOUCH_END, TOUCH_MOVE,
    TOUCH_START, WHEEL,
} from '../../const';
import { IScrollToParams } from './interfaces';
import { SCROLL_VIEW_INVERSION } from './const';

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
    VERTICAL = 'vertical',
    DURATION = 2000,
    FRICTION_FORCE = .035,
    MAX_DURATION = 4000,
    ANIMATION_DURATION = 200,
    MASS = .005,
    MAX_DIST = 12500,
    MAX_VELOCITY_TIMESTAMP = 100,
    SPEED_SCALE = 5;

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL),
    WHEEL_EVENT = new Event(SCROLLER_WHEEL),
    SCROLLBAR_SCROLL_EVENT = new Event(SCROLLER_SCROLLBAR_SCROLL);

/**
 * NgScrollView
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/scroll-view/scroll-view.directive.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'ng-scroll-view',
    template: '',
})
export class NgScrollView implements OnDestroy {
    scrollContent = viewChild<ElementRef<HTMLDivElement>>('scrollContent');

    @ViewChild('scrollViewport', { read: CdkScrollable })
    cdkScrollable: CdkScrollable | undefined;

    scrollViewport = viewChild<ElementRef<HTMLDivElement>>('scrollViewport');

    direction = input<ScrollerDirections>(ScrollerDirection.VERTICAL);

    isVertical: Signal<boolean>;

    grabbing = signal<boolean>(false);

    protected _$updateScrollBar = new Subject<void>();
    protected $updateScrollBar = this._$updateScrollBar.asObservable();

    protected _$scroll = new Subject<boolean>();
    readonly $scroll = this._$scroll.asObservable();

    protected _$scrollEnd = new Subject<boolean>();
    readonly $scrollEnd = this._$scrollEnd.asObservable();

    get scrollable() {
        const { width, height } = this.viewportBounds(),
            isVertical = this.isVertical(),
            viewportSize = isVertical ? height : width,
            totalSize = this._totalSize;
        return totalSize > viewportSize;
    }

    protected _destroyRef = inject(DestroyRef);

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

    protected _velocity: number = 0;

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

    protected _animator = new Animator();

    private _inversion = inject(SCROLL_VIEW_INVERSION);

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
                    takeUntilDestroyed(this._destroyRef),
                    tap(e => {
                        const isVertical = this.isVertical();
                        if (this.cdkScrollable) {
                            this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(WHEEL_EVENT);
                        }
                        if (isVertical) {
                            if (this._y >= 0 && this._y <= this.scrollHeight) {
                                e.stopImmediatePropagation();
                                e.preventDefault();
                            }
                        } else {
                            if (this._x >= 0 && this._x <= this.scrollWidth) {
                                e.stopImmediatePropagation();
                                e.preventDefault();
                            }
                        }
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
                    this.grabbing.set(false);
                }),
            );

        $content.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<MouseEvent>(content, MOUSE_DOWN, { passive: false }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                    switchMap(e => {
                        this.onDragStart();
                        this.stopScrolling();
                        const target = e.target as HTMLElement;
                        if (target.classList.contains(INTERACTIVE)) {
                            return of(undefined);
                        }
                        const inversion = this._inversion, isVertical = this.isVertical();
                        this._isMoving = true;
                        this.grabbing.set(true);
                        const startPos = isVertical ? this.y : this.x;
                        let prevPos = startPos, prevClientPosition = 0, startPosDelta = 0;
                        const startClientPos = isVertical ? e.clientY : e.clientX,
                            offsets = new Array<[number, number]>(), velocities = new Array<[number, number]>();
                        let startTime = Date.now();
                        return fromEvent<MouseEvent>(window, MOUSE_MOVE, { passive: false }).pipe(
                            takeUntilDestroyed(this._destroyRef),
                            takeUntil($mouseDragCancel),
                            tap(e => {
                                e.preventDefault();
                            }),
                            switchMap(e => {
                                const cPos = isVertical ? this.y : this.x;
                                if (cPos !== prevPos) {
                                    startPosDelta += cPos - prevPos;
                                }
                                const currentPos = isVertical ? e.clientY : e.clientX,
                                    scrollSize = isVertical ? this.scrollHeight : this.scrollWidth, delta = (inversion ? -1 : 1) * (startClientPos - currentPos),
                                    dp = startPos + startPosDelta + delta, position = Math.round(dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp), endTime = Date.now(),
                                    timestamp = endTime - startTime, scrollDelta = prevClientPosition === 0 ? 0 : prevClientPosition - currentPos,
                                    { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp);
                                this.calculateAcceleration(velocities, v0, timestamp);
                                prevClientPosition = currentPos;
                                prevPos = position;
                                this.move(isVertical, position, false, true);
                                startTime = endTime;
                                return race([fromEvent<MouseEvent>(window, MOUSE_UP, { passive: false }), fromEvent<MouseEvent>(content, MOUSE_UP, { passive: false })]).pipe(
                                    takeUntilDestroyed(this._destroyRef),
                                    tap(e => {
                                        e.preventDefault();
                                        const endTime = Date.now(),
                                            timestamp = endTime - startTime,
                                            { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp),
                                            { a0 } = this.calculateAcceleration(velocities, v0, timestamp);
                                        this._isMoving = false;
                                        this.grabbing.set(false);
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
                    this.grabbing.set(false);
                }),
            );

        $content.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<TouchEvent>(content, TOUCH_START, { passive: false }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                    switchMap(e => {
                        this.onDragStart();
                        this.stopScrolling();
                        const target = e.target as HTMLElement;
                        if (target.classList.contains(INTERACTIVE)) {
                            return of(undefined);
                        }
                        const inversion = this._inversion, isVertical = this.isVertical();
                        this._isMoving = true;
                        this.grabbing.set(true);
                        const startPos = isVertical ? this.y : this.x;
                        let prevPos = startPos, prevClientPosition = 0, startPosDelta = 0;
                        const startClientPos = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX,
                            offsets = new Array<[number, number]>(), velocities = new Array<[number, number]>();
                        let startTime = Date.now();
                        return fromEvent<TouchEvent>(window, TOUCH_MOVE, { passive: false }).pipe(
                            takeUntilDestroyed(this._destroyRef),
                            takeUntil($touchCanceler),
                            tap(e => {
                                e.preventDefault();
                            }),
                            switchMap(e => {
                                const cPos = isVertical ? this.y : this.x;
                                if (cPos !== prevPos) {
                                    startPosDelta += cPos - prevPos;
                                }
                                const currentPos = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX,
                                    scrollSize = isVertical ? this.scrollHeight : this.scrollWidth, delta = (inversion ? -1 : 1) * (startClientPos - currentPos),
                                    dp = startPos + startPosDelta + delta, position = Math.round(dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp), endTime = Date.now(),
                                    timestamp = endTime - startTime, scrollDelta = prevClientPosition === 0 ? 0 : prevClientPosition - currentPos,
                                    { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp);
                                this.calculateAcceleration(velocities, v0, timestamp);
                                prevClientPosition = currentPos;
                                prevPos = position;
                                this.move(isVertical, position, false, true);
                                startTime = endTime;
                                return race([fromEvent<TouchEvent>(window, TOUCH_END, { passive: false }), fromEvent<TouchEvent>(content, TOUCH_END, { passive: false })]).pipe(
                                    takeUntilDestroyed(this._destroyRef),
                                    tap(e => {
                                        e.preventDefault();
                                        const endTime = Date.now(),
                                            timestamp = endTime - startTime,
                                            { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp),
                                            { a0 } = this.calculateAcceleration(velocities, v0, timestamp);
                                        this._isMoving = false;
                                        this.grabbing.set(false);
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

    protected move(isVertical: boolean, position: number, blending: boolean = false, userAction: boolean = false) {
        this.scroll({ [isVertical ? TOP : LEFT]: position, behavior: INSTANT, blending, userAction });
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

    protected animate(startValue: number, endValue: number, duration = ANIMATION_DURATION, easingFunction: Easing = easeOutQuad, userAction: boolean = false) {
        const isVertical = this.direction() === ScrollerDirection.VERTICAL;
        this._animator.animate({
            startValue, endValue, duration,
            getPropValue: () => {
                return isVertical ? this._y : this._x;
            },
            easingFunction,
            transform: (value: number) => {
                const scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
                    currentValue = value < 0 ? 0 : value > scrollSize ? scrollSize : value;
                return currentValue;
            }, transformIsFinished: (value: number) => {
                const scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
                    actualScrollSize = isVertical ? this.actualScrollHeight : this.actualScrollWidth;
                return (value === scrollSize && Math.round(scrollSize) >= Math.round(actualScrollSize)) || value === 0;
            }, onStart: ({ value }) => {
                const isVertical = this.direction() === ScrollerDirection.VERTICAL;
                if (isVertical) {
                    this.y = value;
                } else {
                    this.x = value;
                }
            }, onUpdate: ({ value }) => {
                const scrollContent = this.scrollContent()?.nativeElement as HTMLDivElement;
                if (scrollContent) {
                    if (isVertical) {
                        this.y = value;
                        scrollContent.style.transform = `translate3d(0, ${(this._inversion ? 1 : -1) * this._y}px, 0)`;
                        if (this.cdkScrollable) {
                            this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLL_EVENT);
                        }
                        this._$scroll.next(userAction);
                    } else {
                        this.x = value;
                        scrollContent.style.transform = `translate3d(${(this._inversion ? 1 : -1) * this._x}px, 0, 0)`;
                        if (this.cdkScrollable) {
                            this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLL_EVENT);
                        }
                        this._$scroll.next(userAction);
                    }
                }
            }, onComplete: () => {
                this.stopScrolling();
                this._$scrollEnd.next(userAction);
            },
        });
    }

    scroll(params: IScrollToParams) {
        const posX = params.x || params.left || 0,
            posY = params.y || params.top || 0,
            userAction = params.userAction ?? false,
            x = posX,
            y = posY,
            ease = params.ease || easeOutQuad,
            fireUpdate = params.fireUpdate ?? true,
            behavior = params.behavior ?? INSTANT,
            blending = params.blending ?? true,
            scrollContent = this.scrollContent()?.nativeElement as HTMLDivElement,
            isVertical = this.direction() === ScrollerDirection.VERTICAL;

        if (this._isMoving) {
            if (isVertical) {
                if (y < 0 || y > this.scrollHeight) {
                    return;
                }
            } else {
                if (x < 0 || x > this.scrollWidth) {
                    return;
                }
            }
        }

        const xx = x,
            yy = y,
            prevX = this.x,
            prevY = this.y;
        this.x = xx;
        this.y = yy;
        if (behavior === AUTO || behavior === SMOOTH) {
            if (isVertical) {
                if (prevY !== yy) {
                    this.animate(prevY, yy, ANIMATION_DURATION, ease, userAction);
                }
            } else {
                if (prevX !== xx) {
                    this.animate(prevX, xx, ANIMATION_DURATION, ease, userAction);
                }
            }
        } else {
            if (isVertical) {
                if (prevY !== yy) {
                    if (!blending) {
                        this.stopScrolling();
                    }
                    scrollContent.style.transform = `translate3d(0, ${(this._inversion ? 1 : -1) * yy}px, 0)`;
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
                    scrollContent.style.transform = `translate3d(${(this._inversion ? 1 : -1) * xx}px, 0, 0)`;
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

    protected fireScrollEvent(userAction: boolean) {
        this._$scroll.next(userAction);
    }

    protected onDragStart() { }

    reset() {
        this.move(this.isVertical(), 0);
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