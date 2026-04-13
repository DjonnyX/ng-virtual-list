import {
    Component, inject, input, ViewChild,
} from '@angular/core';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, fromEvent, map, of, race, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { ScrollerDirection } from './enums';
import { ANIMATOR_MIN_TIMESTAMP, Animator, Easing, easeOutQuad } from '../../utils/animator';
import {
    BEHAVIOR_INSTANT, DEFAULT_OVERSCROLL_ENABLED, DEFAULT_SCROLL_BEHAVIOR, DEFAULT_SCROLLING_SETTINGS, INTERACTIVE, MOUSE_DOWN, MOUSE_MOVE, MOUSE_UP,
    TOUCH_END, TOUCH_MOVE, TOUCH_START, WHEEL,
} from '../../const';
import { IScrollToParams } from './interfaces';
import {
    ANIMATION_DURATION, AUTO, DURATION, FRICTION_FORCE, INSTANT, LEFT, MASS, MAX_DIST, MAX_DURATION, MAX_VELOCITY_TIMESTAMP,
    OVERSCROLL_START_ITERATION, SCROLL_EVENT, SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, SMOOTH, SPEED_SCALE, TOP,
} from './const';
import { calculateDirection } from './utils';
import { BaseScrollView } from './base/base-scroll-view.component';
import { IScrollingSettings } from '../../interfaces';

/**
 * NgScrollView
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/components/ng-scroll-view/ng-scroll-view.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'ng-scroll-view',
    template: '',
})
export class NgScrollView extends BaseScrollView {
    @ViewChild('scrollViewport', { read: CdkScrollable })
    readonly cdkScrollable: CdkScrollable | undefined;

    readonly scrollBehavior = input<ScrollBehavior>(DEFAULT_SCROLL_BEHAVIOR);

    readonly overscrollEnabled = input<boolean>(DEFAULT_OVERSCROLL_ENABLED);

    readonly scrollingSettings = input<IScrollingSettings>(DEFAULT_SCROLLING_SETTINGS);

    protected _normalizeValueFromZero = inject(SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO);

    protected _$scroll = new Subject<boolean>();
    readonly $scroll = this._$scroll.asObservable();

    protected _$scrollEnd = new Subject<boolean>();
    readonly $scrollEnd = this._$scrollEnd.asObservable();

    private _startPosition = 0;

    protected _animator = new Animator();

    protected _interactive = true;

    private _overscrollIteration: number = 0;

    set delta(v: number) {
        this._startPosition += v;
    }

    constructor() {
        super();
        const $viewport = toObservable(this.scrollViewport).pipe(
            takeUntilDestroyed(this._destroyRef),
            filter(v => !!v),
            map(v => v.nativeElement),
        ), $content = toObservable(this.scrollContent).pipe(
            takeUntilDestroyed(this._destroyRef),
            filter(v => !!v),
            map(v => v.nativeElement),
        ), $wheelEmitter = this._inversion ? $viewport : $content;

        $wheelEmitter.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<WheelEvent>(content, WHEEL, { passive: false }).pipe(
                    filter(() => this._interactive),
                    takeUntilDestroyed(this._destroyRef),
                    tap(e => {
                        const isVertical = this.isVertical();
                        this.emitScrollableEvent();
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
                    this.grabbing.set(false);
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
                        const inversion = this._inversion, isVertical = this.isVertical();
                        this._isMoving = true;
                        this.grabbing.set(true);
                        this._startPosition = (isVertical ? this.y : this.x);
                        let prevClientPosition = 0,
                            startClientPos = isVertical ? e.clientY : e.clientX,
                            offsets = new Array<[number, number]>(),
                            velocities = new Array<[number, number]>(),
                            startTime = Date.now();
                        return fromEvent<MouseEvent>(window, MOUSE_MOVE, { passive: false }).pipe(
                            takeUntilDestroyed(this._destroyRef),
                            takeUntil($mouseDragCancel),
                            tap(e => {
                                this.checkOverscroll(e);
                            }),
                            switchMap(e => {
                                const { position, currentPos, endTime, scrollDelta } =
                                    this.calculatePosition(isVertical, e, inversion, startClientPos, startTime, prevClientPosition, offsets, velocities);
                                prevClientPosition = currentPos;
                                this.move(isVertical, position, true, true, true);
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
                                        this.grabbing.set(false);
                                        if (this.scrollBehavior() === BEHAVIOR_INSTANT) {
                                            return;
                                        }
                                        this.moveWithAcceleration(isVertical, position, 0, v0, a0, timestamp);
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
                    filter(() => this._interactive),
                    switchMap(e => {
                        this.cancelOverscroll();
                        this.onDragStart();
                        this.stopScrolling();
                        const target = e.target as HTMLElement;
                        if (target.classList.contains(INTERACTIVE)) {
                            return of(undefined);
                        }
                        const inversion = this._inversion, isVertical = this.isVertical();
                        this._isMoving = true;
                        this.grabbing.set(true);
                        this._startPosition = (isVertical ? this.y : this.x);
                        let prevClientPosition = 0,
                            startClientPos = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX,
                            offsets = new Array<[number, number]>(), velocities = new Array<[number, number]>(),
                            startTime = Date.now();
                        return fromEvent<TouchEvent>(window, TOUCH_MOVE, { passive: false }).pipe(
                            takeUntilDestroyed(this._destroyRef),
                            takeUntil($touchCanceler),
                            tap(e => {
                                this.checkOverscroll(e);
                            }),
                            switchMap(e => {
                                const { position, currentPos, endTime, scrollDelta } =
                                    this.calculatePosition(isVertical, e, inversion, startClientPos, startTime, prevClientPosition, offsets, velocities);
                                prevClientPosition = currentPos;
                                this.move(isVertical, position, true, true, true);
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
                                        this.grabbing.set(false);
                                        if (this.scrollBehavior() === BEHAVIOR_INSTANT) {
                                            return;
                                        }
                                        this.moveWithAcceleration(isVertical, position, 0, v0, a0, timestamp);
                                    }),
                                );
                            }),
                        );
                    })
                );
            }),
        ).subscribe();
    }

    private calculatePosition(isVertical: boolean, e: MouseEvent | TouchEvent | any, inversion: boolean, startClientPos: number, startTime: number,
        prevClientPosition: number, offsets: Array<[number, number]>, velocities: Array<[number, number]>
    ) {
        const currentPos = isVertical ? e.touches?.[e.touches?.length - 1]?.clientY || e.clientY : e.touches?.[e.touches?.length - 1]?.clientX || e.clientX,
            scrollSize = isVertical ? this.scrollHeight : this.scrollWidth, delta = (inversion ? -1 : 1) * (startClientPos - currentPos),
            dp = this._startPosition + delta, position = Math.round(dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp), endTime = Date.now(),
            timestamp = endTime - startTime, scrollDelta = prevClientPosition === 0 ? 0 : prevClientPosition - currentPos,
            { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp);
        this.calculateAcceleration(velocities, v0, timestamp);
        return { position, currentPos, endTime, scrollDelta };
    }

    private cancelOverscroll() {
        if (!this.overscrollEnabled()) {
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
        if (!this.overscrollEnabled()) {
            if (e.cancelable) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
            return;
        }
        if (this.isVertical()) {
            this.checkOverscrollByAxis(e, this._y, this.scrollHeight);
        } else {
            this.checkOverscrollByAxis(e, this._x, this.scrollWidth);
        }
    }

    private calculateVelocity(offsets: Array<[number, number]>, delta: number, timestamp: number, indexOffset: number = 10) {
        offsets.push([delta, timestamp < ANIMATOR_MIN_TIMESTAMP ? ANIMATOR_MIN_TIMESTAMP : timestamp]);

        const len = offsets.length, startIndex = len > indexOffset ? len - indexOffset : 0, lastVSign = calculateDirection(offsets),
            speedScale = this.scrollingSettings()?.speedScale ?? SPEED_SCALE;
        let vSum = 0;
        for (let i = startIndex, l = offsets.length; i < l; i++) {
            const p0 = offsets[i];
            if (lastVSign !== Math.sign(p0[0])) {
                continue;
            }

            const v0 = (p0[1] !== 0 ? lastVSign * Math.abs(p0[0] / p0[1]) * speedScale : 0);
            vSum += Math.sign(v0) * Math.pow(v0, 4) * .003;
        }

        const l = Math.min(offsets.length, indexOffset), v0 = l > 0 ? (vSum / l) : 0;
        return { v0 };
    }

    private calculateAcceleration(velocities: Array<[number, number]>, delta: number, timestamp: number, indexOffset: number = 10) {
        velocities.push([delta, timestamp < ANIMATOR_MIN_TIMESTAMP ? ANIMATOR_MIN_TIMESTAMP : timestamp]);
        const len = velocities.length, startIndex = len > indexOffset ? len - indexOffset : 0;
        let aSum = 0, prevV0: [number, number] | undefined, iteration = 0, lastVSign = calculateDirection(velocities);
        const mass = this.scrollingSettings()?.mass ?? MASS;
        for (let i = startIndex, l = velocities.length; i < l; i++) {
            const v00 = prevV0, v01 = velocities[i];
            if (lastVSign !== Math.sign(v01[0])) {
                continue;
            }
            if (v00) {
                const a0 = timestamp < MAX_VELOCITY_TIMESTAMP ? (v00[1] !== 0 ? (lastVSign * Math.abs(Math.abs(v01[0]) - Math.abs(v00[0]))) / Math.abs(v00[1]) : 0) : 0.1;
                aSum = (aSum * mass) + a0;
                prevV0 = v01;
            }
            prevV0 = v01;
            iteration++;
        }

        const a0 = aSum * (this.scrollingSettings()?.frictionalForce ?? FRICTION_FORCE);
        return { a0 };
    }

    stopScrolling() {
        this._animator.stop();
    }

    protected move(isVertical: boolean, position: number, blending: boolean = false, userAction: boolean = false, fireUpdate: boolean = true) {
        this.scroll({ [isVertical ? TOP : LEFT]: position, behavior: INSTANT, blending, userAction, fireUpdate });
    }

    protected moveWithAcceleration(isVertical: boolean, position: number, v0: number, v: number, a0: number, timestamp: number) {
        if (a0 !== 0 && timestamp < MAX_VELOCITY_TIMESTAMP) {
            const dvSign = Math.sign(v),
                mass = this.scrollingSettings()?.mass ?? MASS,
                duration = DURATION, maxDuration = this.scrollingSettings()?.maxDuration ?? MAX_DURATION,
                maxDist = this.scrollingSettings()?.maxDistance ?? MAX_DIST,
                maxDistance = dvSign * maxDist, s = (dvSign * Math.abs((a0 * Math.pow(duration, 2)) * .5) / 1000) / mass,
                distance = Math.abs(s) < maxDist ? s : maxDistance, positionWithVelocity = position + (this._inversion ? -1 : 1) * distance,
                vmax = Math.max(Math.abs(v0), Math.abs(v)),
                ad = Math.abs(vmax !== 0 ? Math.sqrt(vmax) : 0) * 10 / mass,
                aDuration = ad < maxDuration ? ad : maxDuration,
                startPosition = isVertical ? this.y : this.x;
            this.animate(startPosition, Math.round(positionWithVelocity), aDuration, easeOutQuad, true);
        }
    }

    protected normalizeValue(value: number) {
        const isVertical = this.direction() === ScrollerDirection.VERTICAL,
            startOffset = this._normalizeValueFromZero ? 0 : this.startOffset(),
            scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
            result = value <= startOffset ? startOffset : value > scrollSize ? scrollSize : value;
        return result;
    }

    protected animate(startValue: number, endValue: number, duration = ANIMATION_DURATION, easingFunction: Easing = easeOutQuad,
        userAction: boolean = false) {
        const isVertical = this.direction() === ScrollerDirection.VERTICAL;
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
                this.onAnimationComplete(value);
            },
        });
    }

    protected onAnimationComplete(position: number) { }

    fireScroll(userAction: boolean = false) {
        this.stopScrolling();
        this._$updateScrollBar.next();
        this.emitScrollableEvent();
        this.fireScrollEvent(userAction);
    }

    scrollLimits(value?: number | undefined): boolean {
        const x = value !== undefined ? value : this._x, y = value !== undefined ? value : this._y, isVertical = this.isVertical();
        if (isVertical) {
            const yy = this.normalizeValue(y);
            if (y !== yy) {
                this.y = yy;
                return true;
            }
        } else {
            const xx = this.normalizeValue(x);
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
            isVertical = this.direction() === ScrollerDirection.VERTICAL;

        const x = this.normalizeValue(posX),
            y = this.normalizeValue(posY),
            prevX = this._x,
            prevY = this._y;
        if (behavior === AUTO || behavior === SMOOTH) {
            if (isVertical) {
                if (prevY !== y) {
                    this.animate(prevY, y, duration, ease, userAction);
                }
            } else {
                if (prevX !== x) {
                    this.animate(prevX, x, duration, ease, userAction);
                }
            }
        } else {
            if (isVertical) {
                if (this._y !== y) {
                    if (!blending) {
                        this.stopScrolling();
                    }
                    this.refreshY(y);
                    this.y = y;
                    this.emitScrollableEvent();
                    if (fireUpdate) {
                        this.fireScrollEvent(userAction);
                    }
                }
            } else {
                if (this._x !== x) {
                    if (!blending) {
                        this.stopScrolling();
                    }
                    this.refreshX(x);
                    this.x = x;
                    this.emitScrollableEvent();
                    if (fireUpdate) {
                        this.fireScrollEvent(userAction);
                    }
                }
            }
        }
    }

    protected emitScrollableEvent() {
        if (!!this.cdkScrollable) {
            this.cdkScrollable.getElementRef()?.nativeElement?.dispatchEvent(SCROLL_EVENT);
        }
    }

    refreshX(value: number) {
        const scrollContent = this.scrollContent()?.nativeElement as HTMLDivElement;
        scrollContent.style.transform = `translate3d(${(this._inversion ? 1 : -1) * value}px, 0, 0)`;
    }

    refreshY(value: number) {
        const scrollContent = this.scrollContent()?.nativeElement as HTMLDivElement;
        scrollContent.style.transform = `translate3d(0, ${(this._inversion ? 1 : -1) * value}px, 0)`;
    }

    protected fireScrollEvent(userAction: boolean) {
        this._$scroll.next(userAction);
    }

    protected onDragStart() { }

    reset(offset: number = 0) {
        this.stopScrolling();
        this.move(this.isVertical(), offset);
    }

    ngOnDestroy(): void {
        if (this._animator) {
            this._animator.dispose();
        }
    }
}