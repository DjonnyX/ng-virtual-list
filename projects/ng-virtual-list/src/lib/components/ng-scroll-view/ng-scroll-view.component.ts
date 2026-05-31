import {
    Component, inject, input, ViewChild,
} from '@angular/core';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, debounceTime, delay, filter, fromEvent, map, of, race, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { ANIMATOR_MIN_TIMESTAMP, Animator, Easing, easeOutQuad } from '../../utils/animator';
import {
    BEHAVIOR_INSTANT, DEFAULT_ANIMATION_PARAMS, DEFAULT_OVERSCROLL_ENABLED, DEFAULT_SCROLL_BEHAVIOR, DEFAULT_SCROLLING_ONE_BY_ONE,
    DEFAULT_SCROLLING_SETTINGS, DEFAULT_SNAP_TO_ITEM, DEFAULT_SNAP_TO_ITEM_ALIGN, DEFAULT_SNAPPING_DISTANCE, INTERACTIVE, MOUSE_DOWN,
    MOUSE_MOVE, MOUSE_UP, TOUCH_END, TOUCH_MOVE, TOUCH_START, WHEEL,
} from '../../const';
import { IScrollToParams } from './interfaces';
import {
    ANIMATION_DURATION, AUTO, DURATION, FRICTION_FORCE, INSTANT, INTERSECTION_DISTANCE, LEFT, MASS, MAX_DIST, MAX_DURATION, MAX_ITERATIONS_FOR_AVERAGE_CALCULATIONS,
    MAX_VELOCITY_TIMESTAMP, OVERSCROLL_START_ITERATION, SCROLL_EVENT, SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, SMOOTH, SPEED_SCALE, TOP,
} from './const';
import { calculateDirection, matrix3d } from './utils';
import { BaseScrollView } from './base/base-scroll-view.component';
import { IAnimationParams, IScrollingSettings } from '../../interfaces';
import { SnapToItemAligns } from '../../enums';
import { NgVirtualListService } from '../../ng-virtual-list.service';
import { Id, SnappingDistance, SnapToItemAlign } from '../../types';
import { parseFloatOrPersentageValue } from '../../utils/parse-float-or-persentage-value';
import { isPercentageValue } from '../../utils/is-persentage-value';
import { ScrollingDirection } from '../../utils/scrolling-direction';
import { calculateVelocity } from './utils/calculate-velocity';

/**
 * NgScrollView
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-scroll-view/ng-scroll-view.component.ts
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

    protected _service = inject(NgVirtualListService);

    readonly scrollBehavior = input<ScrollBehavior>(DEFAULT_SCROLL_BEHAVIOR);

    readonly overscrollEnabled = input<boolean>(DEFAULT_OVERSCROLL_ENABLED);

    readonly scrollingSettings = input<IScrollingSettings>(DEFAULT_SCROLLING_SETTINGS);

    readonly snapToItem = input<boolean>(DEFAULT_SNAP_TO_ITEM);

    readonly scrollingOneByOne = input<boolean>(DEFAULT_SCROLLING_ONE_BY_ONE);

    readonly snapToItemAlign = input<SnapToItemAlign>(DEFAULT_SNAP_TO_ITEM_ALIGN);

    readonly snappingDistance = input<SnappingDistance>(DEFAULT_SNAPPING_DISTANCE);

    readonly animationParams = input<IAnimationParams>(DEFAULT_ANIMATION_PARAMS);

    protected _normalizeValueFromZero = inject(SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO);

    protected _isScrollsTo: boolean = false;

    protected _scrollDirection = new ScrollingDirection();
    get scrollDirection() {
        return this._scrollDirection.get();
    }

    get $scrollDirection() { return this._scrollDirection.$direction; }

    protected _$wheel = new Subject<number>();
    readonly $wheel = this._$wheel.asObservable();

    protected _$scroll = new Subject<boolean>();
    readonly $scroll = this._$scroll.asObservable();

    protected _$scrollEnd = new Subject<boolean>();
    readonly $scrollEnd = this._$scrollEnd.asObservable();

    protected _velocities: Array<number> = [];

    protected _$velocity = new BehaviorSubject<number>(0);
    protected $velocity = this._$velocity.asObservable();
    get velocity() { return this._$velocity.getValue(); }

    protected _$averageVelocity = new BehaviorSubject<number>(0);
    protected $averageVelocity = this._$averageVelocity.asObservable();
    get averageVelocity() { return this._$averageVelocity.getValue(); }

    private _measureVelocityTimestamp: number = Date.now();

    private _measureVelocityLastPosition: number = this.isVertical() ? this._y : this._x;

    private _startPosition = 0;

    protected _animator = new Animator();

    protected _interactive = true;

    private _overscrollIteration: number = 0;

    override set x(v: number) {
        if (v !== undefined && !Number.isNaN(v)) {
            this.updateDirection(v, this._x);

            this._x = this._actualX = v;

            this.normalizeScrollSize();

            this.refreshCoordinate(this._x, this._y);

            this.measureVelocity();
        }
    }
    override get x() { return this._x; }

    override set y(v: number) {
        if (v !== undefined && !Number.isNaN(v)) {
            this.updateDirection(v, this._y);

            this._y = this._actualY = v;

            this.normalizeScrollSize();

            this.refreshCoordinate(this._x, this._y);

            this.measureVelocity();
        }
    }
    override get y() { return this._y; }

    protected _delta: number = 0;
    set delta(v: number) {
        this._delta = v;
        this._startPosition += v;
    }

    override set startLayoutOffset(v: number) {
        if (this._startLayoutOffset !== v) {
            this._startLayoutOffset = v;

            this.refreshCoordinate(this._x, this._y);
        }
    }
    override get startLayoutOffset() { return this._startLayoutOffset; }

    protected _intersectionComponentId: Id | null = null;

    protected _isAlignmentAnimation = false;

    constructor() {
        super();

        let mouseCanceled = false,
            touchCanceled = false;

        const $viewportBounds = toObservable(this.viewportBounds);
        $viewportBounds.pipe(
            takeUntilDestroyed(),
            debounceTime(0),
            tap(() => {
                this._isMoving = false;
                this.grabbing.set(false);
                if (!mouseCanceled || !touchCanceled) {
                    this.stopMoving();
                }
                mouseCanceled = touchCanceled = true;
                if (this.snapToItem() || this.scrollingOneByOne()) {
                    this.stopScrolling(true);
                    this.alignPosition(true);
                }
                this._$scrollEnd.next(false);
            }),
        ).subscribe();

        const $wheel = this.$wheel;
        $wheel.pipe(
            takeUntilDestroyed(),
            switchMap(v => of(this.averageVelocity)),
            debounceTime(100),
            tap(v => {
                this.snapWithInitialForceIfNecessary(v);
                this._scrollDirection.clear();
            }),
        ).subscribe();

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
                        this.stopScrolling(true);
                        const scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
                            startPos = isVertical ? this._y : this._x,
                            delta = isVertical ? e.deltaY : e.deltaX, dp = (startPos + delta),
                            position = this.isInfinity() ? dp : (dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp);
                        this.scroll({ [isVertical ? TOP : LEFT]: position, behavior: INSTANT, userAction: true, blending: false, fireUpdate: true });
                        this._$wheel.next(delta);
                    }),
                );
            }),
        ).subscribe();

        const $mouseUp = race([
            fromEvent<MouseEvent>(window, MOUSE_UP, { passive: true }).pipe(
                takeUntilDestroyed(this._destroyRef),
            ),
            $content.pipe(
                takeUntilDestroyed(this._destroyRef),
                switchMap(content => fromEvent<MouseEvent>(content, MOUSE_UP, { passive: true }))
            ),
        ]),
            $mouseDragCancel = $mouseUp.pipe(
                takeUntilDestroyed(this._destroyRef),
                delay(0),
                tap(() => {
                    this._isMoving = false;
                    this.grabbing.set(false);
                    if (!mouseCanceled) {
                        this.stopMoving();
                    }
                    mouseCanceled = true;
                    if (this.snapToItem() && this.scrollingOneByOne()) {
                        this.alignPosition();
                    }
                    this._$scrollEnd.next(true);
                }),
            );

        $content.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<MouseEvent>(content, MOUSE_DOWN, { passive: false }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                    filter(() => this._interactive),
                    switchMap(e => {
                        return race([fromEvent<MouseEvent>(window, MOUSE_UP, { passive: false }), fromEvent<MouseEvent>(content, MOUSE_UP, { passive: false })]).pipe(
                            takeUntilDestroyed(this._destroyRef),
                            takeUntil(fromEvent<MouseEvent>(window, MOUSE_MOVE, { passive: false })),
                            tap(e => {
                                this._isMoving = false;
                                this.grabbing.set(false);
                                if (!mouseCanceled) {
                                    this.stopMoving();
                                }
                                mouseCanceled = true;
                                if (this.snapToItem() || this.scrollingOneByOne()) {
                                    this.alignPosition();
                                }
                                this._$scrollEnd.next(true);
                            }),
                        );
                    }),
                );
            }),
        ).subscribe();

        $content.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<MouseEvent>(content, MOUSE_DOWN, { passive: false }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                    filter(v => this._interactive),
                    switchMap(e => {
                        mouseCanceled = false;
                        this._scrollDirection.clear();
                        this.cancelOverscroll();
                        this.onDragStart();
                        this.stopScrolling(true);
                        this.stopMoving();
                        const target = e.target as HTMLElement;
                        if (target.classList.contains(INTERACTIVE)) {
                            return of(undefined);
                        }
                        const inversion = this._inversion, isVertical = this.isVertical();
                        this._isMoving = true;
                        this.grabbing.set(true);
                        this._startPosition = (isVertical ? this.y : this.x);
                        let prevClientPosition = isVertical ? e.clientY : e.clientX,
                            prevPosition = this._startPosition,
                            startClientPos = prevClientPosition,
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
                                prevPosition = position;
                                prevClientPosition = currentPos;
                                this.move(isVertical, position, true, true, true);
                                const offset = Math.abs(position) - Math.abs(isVertical ? this._y : this._x),
                                    scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
                                    viewportSize = isVertical ? this.viewportBounds().height : this.viewportBounds().width;
                                if (position >= (scrollSize - viewportSize * .5) || position <= 0) {
                                    startClientPos -= offset;
                                }
                                startTime = endTime;
                                return race([fromEvent<MouseEvent>(window, MOUSE_UP, { passive: false }), fromEvent<MouseEvent>(content, MOUSE_UP, { passive: false })]).pipe(
                                    takeUntilDestroyed(this._destroyRef),
                                    takeUntil($mouseDragCancel),
                                    tap(e => {
                                        mouseCanceled = true;
                                        this.cancelOverscroll();
                                        const endTime = Date.now(),
                                            timestamp = endTime - startTime,
                                            { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp),
                                            { a0 } = this.calculateAcceleration(velocities, v0, timestamp);
                                        this._isMoving = false;
                                        this.grabbing.set(false);
                                        if (!this.snapIfNecessary(v0, false) && this.scrollBehavior() !== BEHAVIOR_INSTANT) {
                                            this.moveWithAcceleration(isVertical, position, 0, v0, a0, timestamp);
                                        } else {
                                            this._$scrollEnd.next(true);
                                        }
                                    }),
                                );
                            }),
                        );
                    })
                );
            }),
        ).subscribe();

        const $touchUp = race(
            [
                fromEvent<TouchEvent>(window, TOUCH_END, { passive: false }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                ),
                $content.pipe(
                    takeUntilDestroyed(this._destroyRef),
                    switchMap(content => fromEvent<TouchEvent>(content, TOUCH_END, { passive: false })),
                ),
            ]
        ),
            $touchCanceler = $touchUp.pipe(
                takeUntilDestroyed(this._destroyRef),
                delay(0),
                tap(() => {
                    this._isMoving = false;
                    this.grabbing.set(false);
                    if (!touchCanceled) {
                        this.stopMoving();
                    }
                    touchCanceled = true;
                    if (this.snapToItem() && this.scrollingOneByOne()) {
                        this.alignPosition();
                    }
                    this._$scrollEnd.next(true);
                }),
            );

        $content.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<TouchEvent>(content, TOUCH_START, { passive: false }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                    filter(() => this._interactive),
                    switchMap(e => {
                        return race([fromEvent<TouchEvent>(window, TOUCH_END, { passive: false }), fromEvent<TouchEvent>(content, TOUCH_END, { passive: false })]).pipe(
                            takeUntilDestroyed(this._destroyRef),
                            takeUntil(fromEvent<TouchEvent>(window, TOUCH_MOVE, { passive: false })),
                            tap(e => {
                                this._isMoving = false;
                                this.grabbing.set(false);
                                if (!touchCanceled) {
                                    this.stopMoving();
                                }
                                touchCanceled = true;
                                if (this.snapToItem() || this.scrollingOneByOne()) {
                                    this.alignPosition();
                                }
                                this._$scrollEnd.next(true);
                            }),
                        );
                    }),
                );
            }),
        ).subscribe();

        $content.pipe(
            takeUntilDestroyed(this._destroyRef),
            switchMap(content => {
                return fromEvent<TouchEvent>(content, TOUCH_START, { passive: false }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                    filter(() => this._interactive),
                    switchMap(e => {
                        touchCanceled = false;
                        this._scrollDirection.clear();
                        this.cancelOverscroll();
                        this.onDragStart();
                        this.stopScrolling(true);
                        this.stopMoving();
                        const target = e.target as HTMLElement;
                        if (target.classList.contains(INTERACTIVE)) {
                            return of(undefined);
                        }
                        const inversion = this._inversion, isVertical = this.isVertical();
                        this._isMoving = true;
                        this.grabbing.set(true);
                        this._startPosition = (isVertical ? this.y : this.x);
                        let prevClientPosition = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX,
                            prevPosition = this._startPosition,
                            startClientPos = prevClientPosition,
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
                                prevPosition = position;
                                prevClientPosition = currentPos;
                                this.move(isVertical, position, true, true, true);
                                const offset = Math.abs(position) - Math.abs(isVertical ? this._y : this._x),
                                    scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
                                    viewportSize = isVertical ? this.viewportBounds().height : this.viewportBounds().width;
                                if (position >= (scrollSize - viewportSize * .5) || position <= 0) {
                                    startClientPos -= offset;
                                }
                                startTime = endTime;
                                return race([fromEvent<TouchEvent>(window, TOUCH_END, { passive: false }), fromEvent<TouchEvent>(content, TOUCH_END, { passive: false })]).pipe(
                                    takeUntilDestroyed(this._destroyRef),
                                    takeUntil($touchCanceler),
                                    tap(e => {
                                        touchCanceled = true;
                                        this.cancelOverscroll();
                                        const endTime = Date.now(),
                                            timestamp = endTime - startTime,
                                            { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp),
                                            { a0 } = this.calculateAcceleration(velocities, v0, timestamp);
                                        this._isMoving = false;
                                        this.grabbing.set(false);
                                        if (!this.snapIfNecessary(v0, false) && this.scrollBehavior() !== BEHAVIOR_INSTANT) {
                                            this.moveWithAcceleration(isVertical, position, 0, v0, a0, timestamp);
                                        } else {
                                            this._$scrollEnd.next(true);
                                        }
                                    }),
                                );
                            }),
                        );
                    })
                );
            }),
        ).subscribe();
    }

    protected updateDirection(position: number, prePosition: number) {
        const delta = (position - this._delta) - prePosition;
        this._scrollDirection.add(delta > 0 ? 1 : delta < 0 ? -1 : 0);
    }

    protected override overrideCoordinates(x: number, y: number) {
        super.overrideCoordinates(x, y);
        const position = Math.abs(this.isVertical() ? y : x);
        this._measureVelocityTimestamp = Date.now();
        this._measureVelocityLastPosition = position;
        this.refreshCoordinate(x, y);
    }

    protected measureVelocity() {
        const timestamp = Date.now();
        if (timestamp === this._measureVelocityTimestamp) {
            return;
        }
        const position = Math.abs(this.isVertical() ? this._y : this._x);
        if (!this.isInfinity()) {
            if (position <= 0 || position >= (this.isVertical() ? this.scrollHeight : this.scrollWidth)) {
                this._velocities = [0];
                this._$averageVelocity.next(0);
                this._measureVelocityLastPosition = position;
                this._measureVelocityTimestamp = timestamp;
                return;
            }
        }
        if (this._delta !== 0) {
            return;
        }
        const timeDelta = timestamp - this._measureVelocityTimestamp,
            positionDelta = Math.abs(position - this._measureVelocityLastPosition),
            velocity = timeDelta > 0 ? positionDelta / timeDelta : 0;
        let avgVelocity = this._velocities.length > 0 ? this._velocities.reduce((p, c) => p + c) : 0;
        if (this._velocities.length >= MAX_ITERATIONS_FOR_AVERAGE_CALCULATIONS) {
            this._velocities.shift();
        }
        avgVelocity += velocity;
        this._$velocity.next(velocity);
        this._velocities.push(velocity);
        this._$averageVelocity.next(avgVelocity / MAX_ITERATIONS_FOR_AVERAGE_CALCULATIONS);
        this._measureVelocityLastPosition = position;
        this._measureVelocityTimestamp = timestamp;
    }

    protected stopMoving() { }

    private snapIfNecessary(v0: number, withInitialForce: boolean = true, force: boolean = false) {
        const scrollDirection = this._scrollDirection.get() || (force ? 1 : 0);
        if (scrollDirection === 0) {
            return false;
        }
        const snapToItem = this.snapToItem();
        if (!!snapToItem) {
            const scrollingOneByOne = this.scrollingOneByOne();
            if (scrollingOneByOne) {
                return this.alignPosition();
            }
            if (withInitialForce) {
                return this.snapWithInitialForceIfNecessary(v0);
            }
        }
        return false;
    }

    protected snapWithInitialForceIfNecessary(v0: number | null = null, force: boolean = false) {
        const t = this.animationParams().snapToItem * .01, s = this.getSnappedComponentSize(),
            va = s !== null && t !== 0 ? (s / t) : 0;
        if (va >= Math.abs(v0 ?? this.averageVelocity)) {
            return this.alignPosition(force);
        }
        return false;
    }

    private calculatePosition(isVertical: boolean, e: MouseEvent | TouchEvent | any, inversion: boolean, startClientPos: number, startTime: number,
        prevClientPosition: number, offsets: Array<[number, number]>, velocities: Array<[number, number]>
    ) {
        const currentPos = isVertical ? e.touches?.[e.touches?.length - 1]?.clientY || e.clientY : e.touches?.[e.touches?.length - 1]?.clientX || e.clientX,
            scrollSize = isVertical ? this.scrollHeight : this.scrollWidth, delta = (inversion ? -1 : 1) * (startClientPos - currentPos),
            dp = this._startPosition + delta, position = this.isInfinity() ? dp : dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp,
            endTime = Date.now(), timestamp = endTime - startTime, scrollDelta = prevClientPosition === 0 ? 0 : prevClientPosition - currentPos,
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
        if (!this._overscrollEnabled || !this.overscrollEnabled()) {
            if (e.cancelable) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
            return;
        }
        if (this._overscrollEnabled) {
            if (this.isVertical()) {
                this.checkOverscrollByAxis(e, this._y, this.scrollHeight);
            } else {
                this.checkOverscrollByAxis(e, this._x, this.scrollWidth);
            }
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

    stopScrolling(force: boolean = false) {
        if (this._isAlignmentAnimation && !force) {
            return;
        }
        this._isAlignmentAnimation = false;
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
        } else {
            this.alignPosition();
        }
    }

    protected normalizeValue(value: number) {
        if (this.isInfinity()) {
            return value;
        }
        const isVertical = this.isVertical(),
            startOffset = this._normalizeValueFromZero ? 0 : this.startOffset(),
            scrollSize = this.scrollable ? ((isVertical ? this.scrollHeight : this.scrollWidth) - this.alignmentEndOffset()) : 0,
            result = this.scrollable ? (value <= startOffset ? startOffset : value > scrollSize ? scrollSize : value) : startOffset;
        return result;
    }

    protected animate(startValue: number, endValue: number, duration = ANIMATION_DURATION, easingFunction: Easing = easeOutQuad,
        userAction: boolean = false, alignmentAtComplete: boolean = true) {
        const isVertical = this.isVertical();
        let iteration = 0, position = startValue;
        this._isAlignmentAnimation = !alignmentAtComplete;
        this._animator.animate({
            startValue, endValue, duration,
            easingFunction,
            getPropValue: () => {
                return isVertical ? this._y : this._x;
            }, onUpdate: ({ value, timestamp, elapsed }) => {
                if (this._isCoordinatesOverrided) {
                    this._isCoordinatesOverrided = false;
                    const currentCoordinate = isVertical ? this._y : this._x, delta = endValue - value;
                    this.animate(currentCoordinate, currentCoordinate + delta, duration - elapsed, easingFunction, userAction, alignmentAtComplete);
                    return;
                }
                const v0 = calculateVelocity(position, value, timestamp) ?? this.averageVelocity;
                position = value;
                if (alignmentAtComplete && !this._isAlignmentAnimation) {
                    if (iteration < MAX_ITERATIONS_FOR_AVERAGE_CALCULATIONS || !this.snapIfNecessary(v0)) {
                        this.move(isVertical, value, false, userAction);
                    }
                } else {
                    this.move(isVertical, value, false, userAction);
                }
                iteration++;
                this._service.update(true, true);
            }, onComplete: ({ value, timestamp }) => {
                this._isAlignmentAnimation = false;
                const v0 = calculateVelocity(position, value, timestamp);
                if (alignmentAtComplete && !this._isAlignmentAnimation) {
                    this.snapIfNecessary(v0);
                } else {
                    this.move(isVertical, value, false, userAction);
                }
                this._$scrollEnd.next(userAction);
                this._service.update(true, true);
                this.onAnimationComplete(value);
            },
        });
    }

    protected getSnappedComponentSize() {
        const align = this.snapToItemAlign(), isVertical = this.isVertical(), sd = this.snappingDistance(),
            snappingDistance = parseFloatOrPersentageValue(sd),
            isPersentageSnappingDistance = isPercentageValue(sd);
        let size: number | null = null;
        const scrollDirection = this._scrollDirection.get(),
            currentPosition = (isVertical ? this.scrollTop : this.scrollLeft) - this._startLayoutOffset,
            currentComponentBounds = this._service.getComponentBoundsByIntersectionPosition(currentPosition),
            currentComponentSize = isVertical ? currentComponentBounds?.height ?? 0 : currentComponentBounds?.width ?? 0;
        switch (align) {
            case SnapToItemAligns.START: {
                const offset = ((scrollDirection === 1 ? currentComponentSize : 0) - (isPersentageSnappingDistance ? currentComponentSize * snappingDistance : snappingDistance)) * scrollDirection,
                    componentBounds = this._service.getComponentBoundsByIntersectionPosition(currentPosition + offset);
                if (!!componentBounds) {
                    const { width, height } = componentBounds,
                        compSize = isVertical ? height : width;
                    size = compSize;
                }
                break;
            }
            case SnapToItemAligns.CENTER: {
                const viewportSize = isVertical ? this.viewportBounds().height : this.viewportBounds().width,
                    offset = (currentComponentSize * .5 - (isPersentageSnappingDistance ? currentComponentSize * snappingDistance : snappingDistance)) * scrollDirection,
                    actualPos = currentPosition + offset + viewportSize * .5,
                    maxPos = isVertical ? this.scrollHeight : this.scrollWidth,
                    pos = Math.min(actualPos, maxPos);
                const componentBounds = this._service.getComponentBoundsByIntersectionPosition(pos);
                if (!!componentBounds) {
                    const { width, height } = componentBounds,
                        compSize = isVertical ? height : width;
                    size = compSize;
                }
                break;
            }
            case SnapToItemAligns.END: {
                const viewportSize = isVertical ? this.viewportBounds().height : this.viewportBounds().width,
                    offset = ((scrollDirection === 1 ? currentComponentSize : 0) - (isPersentageSnappingDistance ? currentComponentSize * snappingDistance : snappingDistance)) * scrollDirection,
                    actualPos = currentPosition + offset + viewportSize,
                    maxPos = isVertical ? this.scrollHeight : this.scrollWidth,
                    pos = Math.min(actualPos, maxPos);
                const componentBounds = this._service.getComponentBoundsByIntersectionPosition(pos);
                if (!!componentBounds) {
                    const { width, height } = componentBounds,
                        compSize = isVertical ? height : width;
                    size = compSize;
                }
                break;
            }
        }
        return size;
    }

    protected alignPosition(force: boolean = false) {
        if (!this.snapToItem() || this._isScrollsTo || this._isAlignmentAnimation) {
            return false;
        }
        this.stopScrolling(true);
        const scrollDirection = this._scrollDirection.get() || (force ? 1 : 0);
        if (scrollDirection === 0) {
            return false;
        }
        const align = this.snapToItemAlign(), isVertical = this.isVertical(),
            viewportSize = isVertical ? this.viewportBounds().height : this.viewportBounds().width,
            sd = this.snappingDistance(),
            snappingDistance = parseFloatOrPersentageValue(sd),
            isPersentageSnappingDistance = isPercentageValue(sd);
        let position: number | null = null, size: number = 0;
        const currentPosition = (isVertical ? this.scrollTop : this.scrollLeft) - this._startLayoutOffset,
            currentComponentBounds = this._service.getComponentBoundsByIntersectionPosition(currentPosition),
            currentComponentSize = isVertical ? currentComponentBounds?.height ?? 0 : currentComponentBounds?.width ?? 0;
        switch (align) {
            case SnapToItemAligns.START: {
                const offset = ((scrollDirection === 1 ? currentComponentSize : 0) - (isPersentageSnappingDistance ? currentComponentSize * snappingDistance : snappingDistance)) * scrollDirection,
                    componentBounds = this._service.getComponentBoundsByIntersectionPosition(currentPosition + offset);
                if (!!componentBounds) {
                    const { x, y, width, height } = componentBounds,
                        componentPosition = isVertical ? y : x;
                    size = isVertical ? height : width;
                    position = componentPosition - (this.startOffset() - this.alignmentStartOffset());
                }
                break;
            }
            case SnapToItemAligns.CENTER: {
                const offset = (currentComponentSize * .5 - (isPersentageSnappingDistance ? currentComponentSize * snappingDistance : snappingDistance)) * scrollDirection,
                    actualPos = currentPosition + offset + viewportSize * .5,
                    maxPos = isVertical ? this.scrollHeight : this.scrollWidth,
                    pos = Math.min(actualPos, maxPos);
                const componentBounds = this._service.getComponentBoundsByIntersectionPosition(pos);
                if (!!componentBounds) {
                    const { x, y, width, height } = componentBounds,
                        componentPosition = isVertical ? y : x;
                    size = isVertical ? height : width;
                    position = componentPosition + size * .5 - viewportSize * .5 - (this.startOffset() - this.alignmentStartOffset()) * .5;
                }
                break;
            }
            case SnapToItemAligns.END: {
                const offset = ((scrollDirection === 1 ? currentComponentSize : 0) - (isPersentageSnappingDistance ? currentComponentSize * snappingDistance : snappingDistance)) * scrollDirection,
                    actualPos = currentPosition + offset + viewportSize,
                    maxPos = isVertical ? this.scrollHeight : this.scrollWidth,
                    pos = Math.min(actualPos, maxPos);
                const componentBounds = this._service.getComponentBoundsByIntersectionPosition(pos);
                if (!!componentBounds) {
                    const { x, y, width, height } = componentBounds,
                        componentPosition = isVertical ? y : x;
                    size = isVertical ? height : width;
                    position = componentPosition - viewportSize;
                }
                break;
            }
        }

        const cPos = (isVertical ? this.scrollTop : this.scrollLeft);

        if (position !== null && position !== cPos) {
            this.stopScrolling(true);
            const fPos = position + this._startLayoutOffset;
            this.animate(cPos, fPos, this.animationParams().snapToItem, easeOutQuad, false, false);
            return true;
        }
        return false;
    }

    private checkIntersectionComponent() {
        const align = this.snapToItemAlign(), isVertical = this.isVertical(),
            viewportSize = isVertical ? this.viewportBounds().height : this.viewportBounds().width;
        let componentId: Id | null = null;
        const currentPosition = (isVertical ? this.scrollTop : this.scrollLeft) - this._startLayoutOffset,
            currentComponentBounds = this._service.getComponentBoundsByIntersectionPosition(currentPosition),
            currentComponentSize = isVertical ? currentComponentBounds?.height ?? 0 : currentComponentBounds?.width ?? 0;
        switch (align) {
            case SnapToItemAligns.START: {
                const offset = (currentComponentSize - (currentComponentSize * INTERSECTION_DISTANCE)),
                    componentBounds = this._service.getComponentBoundsByIntersectionPosition(currentPosition + offset);
                if (!!componentBounds) {
                    const { id } = componentBounds;
                    componentId = id;
                }
                break;
            }
            case SnapToItemAligns.CENTER: {
                const offset = (currentComponentSize * .5 - (currentComponentSize * INTERSECTION_DISTANCE)),
                    actualPos = currentPosition + offset + viewportSize * .5,
                    maxPos = isVertical ? this.scrollHeight : this.scrollWidth,
                    pos = Math.min(actualPos, maxPos);
                const componentBounds = this._service.getComponentBoundsByIntersectionPosition(pos);
                if (!!componentBounds) {
                    const { id } = componentBounds;
                    componentId = id;
                }
                break;
            }
            case SnapToItemAligns.END: {
                const offset = (currentComponentSize - (currentComponentSize * INTERSECTION_DISTANCE)),
                    actualPos = currentPosition + offset + viewportSize,
                    maxPos = isVertical ? this.scrollHeight : this.scrollWidth,
                    pos = Math.min(actualPos, maxPos);
                const componentBounds = this._service.getComponentBoundsByIntersectionPosition(pos);
                if (!!componentBounds) {
                    const { id } = componentBounds;
                    componentId = id;
                }
                break;
            }
        }

        if (componentId !== this._intersectionComponentId && componentId !== null) {
            this._service.setIntersectionElementBySnapToItemAlign(componentId);
        }
        this._intersectionComponentId = componentId;
    }

    protected onAnimationComplete(position: number) { }

    fireScroll(userAction: boolean = false) {
        this._$updateScrollBar.next();
        this.emitScrollableEvent();
        this.fireScrollEvent(userAction);
    }

    scrollLimits(value?: number | undefined, silent: boolean = false): boolean {
        if (!this.isInfinity()) {
            const x = value !== undefined ? value : this._x, y = value !== undefined ? value : this._y, isVertical = this.isVertical();
            if (isVertical) {
                const yy = this.normalizeValue(y);
                if (y !== yy) {
                    if (silent) {
                        this._y = yy;
                        this.refreshCoordinate(this._x, this._y);
                    } else {
                        this.y = yy;
                    }
                    return true;
                }
            } else {
                const xx = this.normalizeValue(x);
                if (x !== xx) {
                    if (silent) {
                        this._x = xx;
                        this.refreshCoordinate(this._x, this._y);
                    } else {
                        this.x = xx;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    scroll(params: IScrollToParams) {
        if (!this.scrollable && !this.isInfinity()) {
            return;
        }

        const posX = params.x || params.left || 0,
            posY = params.y || params.top || 0,
            userAction = params.userAction ?? false,
            snap = params.snap ?? true,
            ease = params.ease || easeOutQuad,
            fireUpdate = params.fireUpdate ?? true,
            behavior = params.behavior ?? INSTANT,
            blending = params.blending ?? true,
            force = params.force ?? false,
            duration = params.duration ?? ANIMATION_DURATION,
            isVertical = this.isVertical();

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
                if (this._y !== y || force) {
                    if (!blending) {
                        this.stopScrolling(true);
                    }
                    this.y = y;
                    if (snap && (!this._isAlignmentAnimation || force)) {
                        this.checkIntersectionComponent();
                    }
                    this.emitScrollableEvent();
                    if (fireUpdate) {
                        this.fireScrollEvent(userAction);
                    }
                }
            } else {
                if (this._x !== x || force) {
                    if (!blending) {
                        this.stopScrolling(true);
                    }
                    this.x = x;
                    if (snap && (!this._isAlignmentAnimation || force)) {
                        this.checkIntersectionComponent();
                    }
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

    refreshCoordinate(x: number, y: number) {
        const scrollContent = this.scrollContent()?.nativeElement as HTMLDivElement;
        scrollContent.style.transform = matrix3d((this._inversion ? 1 : -1) * x + (this.isVertical() ? 0 : this._startLayoutOffset), (this._inversion ? 1 : -1) * y + (this.isVertical() ? this._startLayoutOffset : 0));
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