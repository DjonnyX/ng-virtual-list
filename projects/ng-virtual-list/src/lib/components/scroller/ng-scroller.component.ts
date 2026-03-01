import { Component, computed, DestroyRef, ElementRef, inject, input, OnDestroy, Signal, signal, ViewChild, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, filter, fromEvent, map, of, race, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { ScrollerDirection } from './enums';
import { ScrollBox } from './utils';
import { ScrollerDirections } from './enums';
import { Id, ISize, ScrollBarTheme } from '../../types';
import { Easing } from './types';
import { easeLinear, easeOutQuad } from './utils/ease';
import { NgScrollBarComponent } from "../ng-scroll-bar/ng-scroll-bar.component";
import { GradientColorPositions } from '../../types/gradient-color-positions';
import {
  DEFAULT_SCROLLBAR_MIN_SIZE,
  INTERACTIVE, MOUSE_DOWN, MOUSE_MOVE, MOUSE_UP, SCROLLER_SCROLL, SCROLLER_SCROLLBAR_SCROLL, SCROLLER_WHEEL, TOUCH_END, TOUCH_MOVE,
  TOUCH_START, WHEEL,
} from '../../const';
import { TextDirection, TextDirections } from '../../enums';
import { NgVirtualListService } from '../../ng-virtual-list.service';

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
  MIN_TIMESTAMP = 20,
  MAX_VELOCITY_TIMESTAMP = 100,
  MIN_ANIMATED_VALUE = 10,
  SPEED_SCALE = 5;

const getStartTime = () => { return performance.now(); }

const calculateDirection = (buffer: Array<[number, number]>) => {
  for (let i = buffer.length - 1, l = 0; i >= l; i--) {
    const v = buffer[i];
    if (v[0] === 0) {
      continue;
    }
    return Math.sign(v[0]);
  }
  return 1;
}

interface IAnimation {
  finished: () => boolean;
  to: (value: number) => void;
  cancel: () => void;
}

export interface IScrollToParams {
  x?: number;
  y?: number;
  left?: number;
  top?: number;
  blending?: boolean;
  behavior?: ScrollBehavior;
  userAction?: boolean;
}

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL),
  WHEEL_EVENT = new Event(SCROLLER_WHEEL),
  SCROLLBAR_SCROLL_EVENT = new Event(SCROLLER_SCROLLBAR_SCROLL);

/**
 * The scroller for the NgVirtualList item component
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/components/scroller/ng-scroller.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroller',
  standalone: false,
  templateUrl: './ng-scroller.component.html',
  styleUrl: './ng-scroller.component.scss'
})
export class NgScrollerComponent implements OnDestroy {
  scrollContent = viewChild<ElementRef<HTMLDivElement>>('scrollContent');

  @ViewChild('scrollViewport', { read: CdkScrollable })
  cdkScrollable: CdkScrollable | undefined;

  @ViewChild('scrollBar', { read: NgScrollBarComponent })
  scrollBar: NgScrollBarComponent | undefined;

  scrollViewport = viewChild<ElementRef<HTMLDivElement>>('scrollViewport');

  direction = input<ScrollerDirections>(ScrollerDirection.VERTICAL);

  focusedElement = input<Id | undefined>(undefined);

  content = input<HTMLElement>();

  loading = input<boolean>(false);

  classes = input<{ [cName: string]: boolean }>({});

  startOffset = input<number>(0);

  endOffset = input<number>(0);

  scrollbarTheme = input<ScrollBarTheme | undefined>(undefined);

  scrollbarMinSize = input<number>(DEFAULT_SCROLLBAR_MIN_SIZE);

  actualClasses: Signal<{ [cName: string]: boolean }>;

  containerClasses: Signal<{ [cName: string]: boolean }>;

  isVertical: Signal<boolean>;

  thumbGradientPositions = signal<GradientColorPositions>([0, 0]);

  thumbSize = signal<number>(0);

  thumbPosition = signal<number>(0);

  thumbShow = signal<boolean>(false);

  preparedSignal = signal<boolean>(false);

  grabbing = signal<boolean>(false);

  private _service = inject(NgVirtualListService);

  langTextDir: Signal<TextDirection | undefined>;

  private _$updateScrollBar = new Subject<void>();
  protected $updateScrollBar = this._$updateScrollBar.asObservable();

  private _$scroll = new Subject<boolean>();
  readonly $scroll = this._$scroll.asObservable();

  private _$scrollEnd = new Subject<boolean>();
  readonly $scrollEnd = this._$scrollEnd.asObservable();

  private _scrollBox = new ScrollBox();

  get scrollable() {
    const { width, height } = this.viewportBounds(),
      isVertical = this.isVertical(),
      viewportSize = isVertical ? height : width,
      totalSize = this._totalSize;
    return totalSize > viewportSize;
  }

  get host() {
    return this.scrollViewport()?.nativeElement;
  }

  private _prepared = false;
  set prepared(v: boolean) {
    if (this._prepared !== v) {
      this._prepared = v;
      this.preparedSignal.set(v);
    }
  }

  private _destroyRef = inject(DestroyRef);

  private _isMoving = false;

  private _x: number = 0;
  set x(v: number) {
    this._x = this._actualX = v;

    this.updateScrollBar();
  }
  get x() { return this._x; }

  private _y: number = 0;
  set y(v: number) {
    this._y = this._actualY = v;

    this.updateScrollBar();
  }
  get y() { return this._y; }

  private _currentAnimation: IAnimation | undefined;

  private _totalSize: number = 0;
  set totalSize(v: number) {
    this._totalSize = v;
  }

  get actualScrollHeight() {
    const { height: viewportHeight } = this.viewportBounds(),
      totalSize = this._totalSize,
      isVertical = this.direction() === VERTICAL;
    return isVertical ? totalSize < viewportHeight ? 0 : totalSize - viewportHeight : this.scrollHeight;
  }

  get actualScrollWidth() {
    const { width: viewportWidth } = this.viewportBounds(),
      totalSize = this._totalSize,
      isVertical = this.direction() === VERTICAL;
    return isVertical ? this.scrollWidth : totalSize < viewportWidth ? 0 : totalSize - viewportWidth;
  }

  private _actualX: number = 0;
  get actualScrollLeft() {
    return this._actualX;
  }

  private _actualY: number = 0;
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
    return contentWidth < actualViewportWidth ? 0 : (contentWidth - actualViewportWidth);
  }

  get scrollHeight() {
    const { height: viewportHeight } = this.viewportBounds(),
      actualViewportHeight = viewportHeight,
      { height: contentHeight } = this.contentBounds();
    return contentHeight < actualViewportHeight ? 0 : (contentHeight - actualViewportHeight);
  }

  private _velocity: number = 0;

  readonly viewportBounds = signal<ISize>({ width: 0, height: 0 });

  readonly contentBounds = signal<ISize>({ width: 0, height: 0 });

  private _viewportResizeObserver: ResizeObserver;

  private _onResizeViewportHandler = () => {
    const viewport = this.scrollViewport()?.nativeElement;
    if (viewport) {
      this.viewportBounds.set({ width: viewport.offsetWidth, height: viewport.offsetHeight });
      this.updateScrollBar();
    }
  }

  private _contentResizeObserver: ResizeObserver;

  private _onResizeContentHandler = () => {
    const content = this.scrollContent()?.nativeElement;
    if (content) {
      this.contentBounds.set({ width: content.offsetWidth, height: content.offsetHeight });
      this.updateScrollBar();
    }
  }

  private _updateScrollBarId: number | undefined;

  constructor() {
    this.langTextDir = toSignal(this._service.$langTextDir);

    this._viewportResizeObserver = new ResizeObserver(this._onResizeViewportHandler);
    this._contentResizeObserver = new ResizeObserver(this._onResizeContentHandler);

    this.isVertical = computed(() => {
      return this.direction() === ScrollerDirection.VERTICAL;
    });

    const $viewport = toObservable(this.scrollViewport).pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      map(v => v!.nativeElement),
    ),
      $content = toObservable(this.scrollContent).pipe(
        takeUntilDestroyed(),
        filter(v => !!v),
        map(v => v!.nativeElement),
      ),
      $updateScrollBar = this.$updateScrollBar;

    const updateScrollBarHandler = () => {
      const direction = this.direction(),
        isVertical = this.isVertical(),
        startOffset = this.startOffset(),
        endOffset = this.endOffset(),
        scrollContent = this.scrollContent()?.nativeElement as HTMLElement,
        scrollViewport = this.scrollViewport()?.nativeElement as HTMLDivElement,
        {
          thumbSize,
          thumbPosition,
          thumbGradientPositions,
        } = this._scrollBox.calculateScroll({
          direction,
          viewportWidth: scrollViewport.offsetWidth, viewportHeight: scrollViewport.offsetHeight,
          contentWidth: scrollContent.offsetWidth, contentHeight: scrollContent.offsetHeight,
          startOffset,
          endOffset,
          positionX: this._x,
          positionY: this._y,
          minSize: this.scrollbarMinSize(),
        });

      this.thumbGradientPositions.set(thumbGradientPositions);
      this.thumbSize.set(thumbSize);
      this.thumbPosition.set(thumbPosition);
      this.thumbShow.set(isVertical ? this.scrollHeight > 0 : this.scrollWidth > 0);
    };

    const updateScrollBarRAFHandler = (time: DOMHighResTimeStamp) => {
      updateScrollBarHandler();
    };

    $updateScrollBar.pipe(
      takeUntilDestroyed(),
      debounceTime(0),
      tap(() => {
        const updateScrollBarId = this._updateScrollBarId;
        if (updateScrollBarId !== undefined) {
          cancelAnimationFrame(updateScrollBarId);
        }
        this._updateScrollBarId = requestAnimationFrame(updateScrollBarRAFHandler);
      }),
    ).subscribe();

    $viewport.pipe(
      takeUntilDestroyed(),
      tap(viewport => {
        this._viewportResizeObserver.observe(viewport);
        this._onResizeViewportHandler();
      }),
    ).subscribe();

    $content.pipe(
      takeUntilDestroyed(),
      tap(content => {
        this._contentResizeObserver.observe(content);
        this._onResizeContentHandler();
      }),
    ).subscribe();

    $content.pipe(
      takeUntilDestroyed(),
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
              delta = isVertical ? e.deltaY : e.deltaX, dp = startPos + delta, position = dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp;
            this.scrollTo({ [isVertical ? TOP : LEFT]: position, behavior: INSTANT, userAction: true });
          }),
        );
      }),
    ).subscribe();

    const $mouseUp = fromEvent<MouseEvent>(window, MOUSE_UP, { passive: false }).pipe(
      takeUntilDestroyed(),
    ),
      $mouseDragCancel = $mouseUp.pipe(
        takeUntilDestroyed(),
        tap(() => {
          this._isMoving = false;
          this.grabbing.set(false);
        }),
      );

    $content.pipe(
      takeUntilDestroyed(),
      switchMap(content => {
        return fromEvent<MouseEvent>(content, MOUSE_DOWN, { passive: false }).pipe(
          takeUntilDestroyed(this._destroyRef),
          switchMap(e => {
            if (this.scrollBar) {
              this.scrollBar.stopScrolling();
            }
            this.stopScrolling();
            const target = e.target as HTMLElement;
            if (target.classList.contains(INTERACTIVE)) {
              return of(undefined);
            }
            const isVertical = this.isVertical();
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
                  scrollSize = isVertical ? this.scrollHeight : this.scrollWidth, delta = startClientPos - currentPos,
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
      takeUntilDestroyed(),
    ),
      $touchCanceler = $touchUp.pipe(
        takeUntilDestroyed(this._destroyRef),
        tap(() => {
          this._isMoving = false;
          this.grabbing.set(false);
        }),
      );

    $content.pipe(
      takeUntilDestroyed(),
      switchMap(content => {
        return fromEvent<TouchEvent>(content, TOUCH_START, { passive: false }).pipe(
          takeUntilDestroyed(this._destroyRef),
          switchMap(e => {
            if (this.scrollBar) {
              this.scrollBar.stopScrolling();
            }
            this.stopScrolling();
            const target = e.target as HTMLElement;
            if (target.classList.contains(INTERACTIVE)) {
              return of(undefined);
            }
            const isVertical = this.isVertical();
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
                  scrollSize = isVertical ? this.scrollHeight : this.scrollWidth, delta = startClientPos - currentPos,
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

    this.actualClasses = computed(() => {
      const classes = this.classes(), direction = this.direction();
      return { ...classes, [direction]: true, grabbing: this.grabbing() };
    });

    this.containerClasses = computed(() => {
      return { [this.direction()]: true, grabbing: this.grabbing() };
    });
  }

  private calculateVelocity(offsets: Array<[number, number]>, delta: number, timestamp: number, indexOffset: number = 10) {
    offsets.push([delta, timestamp < MIN_TIMESTAMP ? MIN_TIMESTAMP : timestamp]);

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
    velocities.push([delta, timestamp < MIN_TIMESTAMP ? MIN_TIMESTAMP : timestamp]);
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
    if (this._currentAnimation !== undefined) {
      this._currentAnimation.cancel();
      this._currentAnimation = undefined;
    }
  }

  private move(isVertical: boolean, position: number, blending: boolean = false, userAction: boolean = false) {
    this.scrollTo({ [isVertical ? TOP : LEFT]: position, behavior: INSTANT, blending, userAction });
  }

  private moveWithAcceleration(isVertical: boolean, position: number, v0: number, v: number, a0: number) {
    if (a0 !== 0) {
      const dvSign = Math.sign(v),
        duration = DURATION, maxDuration = MAX_DURATION,
        maxDistance = dvSign * MAX_DIST, s = (dvSign * Math.abs((a0 * Math.pow(duration, 2)) * .5) / 1000) / MASS,
        distance = Math.abs(s) < MAX_DIST ? s : maxDistance, positionWithVelocity = position + distance,
        vmax = Math.max(Math.abs(v0), Math.abs(v)),
        ad = Math.abs(vmax !== 0 ? Math.sqrt(vmax) : 0) * 10 / MASS,
        aDuration = ad < maxDuration ? ad : maxDuration,
        startPosition = isVertical ? this.y : this.x;
      this.animate(startPosition, Math.round(positionWithVelocity), aDuration, easeOutQuad, true);
    }
  }

  animate(startValue: number, endValue: number, duration = ANIMATION_DURATION, easingFunction: Easing = easeLinear, userAction: boolean = false) {
    this.stopScrolling();
    const startTime = getStartTime(), isVertical = this.direction() === ScrollerDirection.VERTICAL;
    let isCanceled = false, prevPos = startValue, start = startValue, startPosDelta = 0, delta = 0, prevTime = startTime,
      diff = Math.abs(Math.abs(endValue) - Math.abs(start));

    if (diff < MIN_ANIMATED_VALUE) {
      if (isVertical) {
        this.y = prevPos = start = endValue;
      } else {
        this.x = prevPos = start = endValue;
      }
    } else {
      if (isVertical) {
        this.y = start;
      } else {
        this.x = start;
      }
    }

    let finishedValue = endValue,
      isFinished = false, animationId: number;

    const step = (currentTime: number) => {
      if (!!isCanceled) {
        return;
      }

      const cPos = isVertical ? this.y : this.x;
      let scrollDelta = 0;
      if (cPos !== prevPos) {
        scrollDelta = cPos - prevPos;
        startPosDelta += scrollDelta;
      }

      const elapsed = currentTime - startTime,
        progress = start === endValue ? 1 : Math.min(duration > 0 ? elapsed / duration : 0, 1),
        easedProgress = easingFunction(progress),
        val = startPosDelta + start + (finishedValue - start) * easedProgress,
        scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
        actualScrollSize = isVertical ? this.actualScrollHeight : this.actualScrollWidth,
        currentValue = val < 0 ? 0 : val > scrollSize ? scrollSize : val,
        t = Date.now();

      isFinished = (currentValue === scrollSize && Math.round(scrollSize) >= Math.round(actualScrollSize)) ||
        currentValue === 0 || progress === 1;

      delta = currentValue - scrollDelta - prevPos;

      const ts = t - prevTime, timestamp = ts < MIN_TIMESTAMP ? MIN_TIMESTAMP : ts;
      this._velocity = timestamp > 0 ? delta / timestamp : 0;

      prevTime = t;
      prevPos = currentValue;

      const scrollContent = this.scrollContent()?.nativeElement as HTMLDivElement;
      if (scrollContent) {
        if (isVertical) {
          this.y = currentValue;
          scrollContent.style.transform = `translate3d(0, ${-currentValue}px, 0)`;
          if (this.cdkScrollable) {
            this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLL_EVENT);
          }
          this._$scroll.next(userAction);
        } else {
          this.x = currentValue;
          scrollContent.style.transform = `translate3d(${-currentValue}px, 0, 0)`;
          if (this.cdkScrollable) {
            this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLL_EVENT);
          }
          this._$scroll.next(userAction);
        }
      }
      if (isFinished) {
        this.stopScrolling();
        this._$scrollEnd.next(userAction);
      } else {
        animationId = requestAnimationFrame(step);
      }
    }, cancel = () => {
      cancelAnimationFrame(animationId);
      isCanceled = true;
    }, to = (value: number) => {
      finishedValue = value;
    }, finished = () => { return isFinished; };

    animationId = requestAnimationFrame(step);

    this._currentAnimation = {
      cancel,
      to,
      finished,
    };
  }

  private updateScrollBar() {
    this._$updateScrollBar.next();
  }

  scrollTo(params: IScrollToParams) {
    const posX = params.x || params.left || 0,
      posY = params.y || params.top || 0,
      userAction = params.userAction ?? false,
      x = posX,
      y = posY,
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
          this.animate(prevY, yy, ANIMATION_DURATION, easeLinear, userAction);
        }
      } else {
        if (prevX !== xx) {
          this.animate(prevX, xx, ANIMATION_DURATION, easeLinear, userAction);
        }
      }
    } else {
      if (isVertical) {
        if (prevY !== yy) {
          if (!blending) {
            this.stopScrolling();
          }
          scrollContent.style.transform = `translate3d(0, ${-yy}px, 0)`;
          if (this.cdkScrollable) {
            this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLL_EVENT);
          }
          this._$scroll.next(userAction);
        }
      } else {
        if (prevX !== xx) {
          if (!blending) {
            this.stopScrolling();
          }
          scrollContent.style.transform = `translate3d(${-xx}px, 0, 0)`;
          if (this.cdkScrollable) {
            this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLL_EVENT);
          }
          this._$scroll.next(userAction);
        }
      }
    }
  }

  reset() {
    if (this.scrollBar) {
      this.scrollBar.stopScrolling();
    }
    this.move(this.isVertical(), 0);
  }

  onScrollBarDragHandler(position: number) {
    this._isMoving = true;
    const isVertical = this.isVertical(),
      {
        position: absolutePosition,
      } = this._scrollBox.getScrollPositionByScrollBar({
        scrollSize: isVertical ? this.actualScrollHeight : this.actualScrollWidth,
        position,
      });
    this.scrollTo({ [isVertical ? TOP : LEFT]: absolutePosition, behavior: AUTO, blending: true, userAction: true });
    if (this.cdkScrollable) {
      this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLLBAR_SCROLL_EVENT);
    }
    this._isMoving = false;
  }

  ngOnDestroy(): void {
    const updateScrollBarId = this._updateScrollBarId;
    if (updateScrollBarId !== undefined) {
      cancelAnimationFrame(updateScrollBarId);
      this._updateScrollBarId = undefined;
    }

    this.stopScrolling();
    if (this._viewportResizeObserver) {
      this._viewportResizeObserver.disconnect();
    }
    if (this._contentResizeObserver) {
      this._contentResizeObserver.disconnect();
    }
  }
}
