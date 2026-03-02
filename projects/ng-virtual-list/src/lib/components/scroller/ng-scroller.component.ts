import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { BehaviorSubject, combineLatest, debounceTime, filter, fromEvent, map, of, race, Subject, switchMap, takeUntil, tap } from 'rxjs';
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
import { DisposableComponent } from '../../utils/disposable-component';

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

export interface IScrollToParams {
  x?: number;
  y?: number;
  left?: number;
  top?: number;
  blending?: boolean;
  behavior?: "auto" | "instant" | "smooth" | string;
  userAction?: boolean;
}

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL),
  WHEEL_EVENT = new Event(SCROLLER_WHEEL),
  SCROLLBAR_SCROLL_EVENT = new Event(SCROLLER_SCROLLBAR_SCROLL);

/**
 * The scroller for the NgVirtualList item component
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/components/scroller/ng-scroller.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroller',
  templateUrl: './ng-scroller.component.html',
  styleUrls: ['./ng-scroller.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgScrollerComponent extends DisposableComponent implements OnDestroy {
  @ViewChild('scrollContent')
  scrollContent: ElementRef<HTMLDivElement> | undefined;

  @ViewChild('scrollViewport', { read: CdkScrollable })
  cdkScrollable: CdkScrollable | undefined;

  @ViewChild('scrollBar', { read: NgScrollBarComponent })
  scrollBar: NgScrollBarComponent | undefined;

  @ViewChild('scrollViewport')
  scrollViewport: ElementRef<HTMLDivElement> | undefined;

  private _$viewInitialized = new BehaviorSubject<boolean>(false);
  readonly $viewInitialized = this._$viewInitialized.asObservable();

  private _$direction = new BehaviorSubject<ScrollerDirections>(ScrollerDirection.VERTICAL);
  readonly $direction = this._$direction.asObservable();

  @Input()
  set direction(v: ScrollerDirections) {
    this._$direction.next(v);
  }
  get direction() { return this._$direction.getValue(); }

  private _$focusedElement = new BehaviorSubject<Id | undefined>(undefined);
  readonly $focusedElement = this._$focusedElement.asObservable();

  @Input()
  set focusedElement(v: Id | undefined) {
    this._$focusedElement.next(v);
  }
  get focusedElement() { return this._$focusedElement.getValue(); }

  private _$loading = new BehaviorSubject<boolean>(false);
  readonly $loading = this._$loading.asObservable();

  @Input()
  set loading(v: boolean) {
    this._$loading.next(v);
  }
  get loading() { return this._$loading.getValue(); }

  private _$classes = new BehaviorSubject<{ [cName: string]: boolean }>({});
  readonly $classes = this._$classes.asObservable();

  @Input()
  set classes(v: { [cName: string]: boolean }) {
    this._$classes.next(v);
  }
  get classes() { return this._$classes.getValue(); }

  private _$startOffset = new BehaviorSubject<number>(0);
  readonly $startOffset = this._$startOffset.asObservable();

  @Input()
  set startOffset(v: number) {
    this._$startOffset.next(v);
  }
  get startOffset() { return this._$startOffset.getValue(); }

  private _$endOffset = new BehaviorSubject<number>(0);
  readonly $endOffset = this._$endOffset.asObservable();

  @Input()
  set endOffset(v: number) {
    this._$endOffset.next(v);
  }
  get endOffset() { return this._$endOffset.getValue(); }

  private _$scrollbarTheme = new BehaviorSubject<ScrollBarTheme | undefined>(undefined);
  readonly $scrollbarTheme = this._$scrollbarTheme.asObservable();

  @Input()
  set scrollbarTheme(v: ScrollBarTheme | undefined) {
    this._$scrollbarTheme.next(v);
  }
  get scrollbarTheme() { return this._$scrollbarTheme.getValue(); }

  private _$scrollbarMinSize = new BehaviorSubject<number>(DEFAULT_SCROLLBAR_MIN_SIZE);
  readonly $scrollbarMinSize = this._$scrollbarMinSize.asObservable();

  @Input()
  set scrollbarMinSize(v: number) {
    this._$scrollbarMinSize.next(v);
  }
  get scrollbarMinSize() { return this._$scrollbarMinSize.getValue(); }

  private _$actualClasses = new BehaviorSubject<{ [cName: string]: boolean }>({});
  readonly $actualClasses = this._$actualClasses.asObservable();

  private _$containerClasses = new BehaviorSubject<{ [cName: string]: boolean }>({});
  readonly $containerClasses = this._$containerClasses.asObservable();

  private _$isVertical = new BehaviorSubject<boolean>(true);
  readonly $isVertical = this._$isVertical.asObservable();

  private _$thumbGradientPositions = new BehaviorSubject<GradientColorPositions>([0, 0]);
  readonly $thumbGradientPositions = this._$thumbGradientPositions.asObservable();

  private _$thumbSize = new BehaviorSubject<number>(0);
  readonly $thumbSize = this._$thumbSize.asObservable();

  private _$thumbPosition = new BehaviorSubject<number>(0);
  readonly $thumbPosition = this._$thumbPosition.asObservable();

  private _$thumbShow = new BehaviorSubject<boolean>(false);
  readonly $thumbShow = this._$thumbShow.asObservable();

  private _$preparedSignal = new BehaviorSubject<boolean>(false);
  readonly $preparedSignal = this._$preparedSignal.asObservable();

  private _$grabbing = new BehaviorSubject<boolean>(false);
  readonly $grabbing = this._$grabbing.asObservable();

  private _$langTextDir = new BehaviorSubject<TextDirection>(TextDirections.LTR);
  readonly $langTextDir = this._$langTextDir.asObservable();

  private _$updateScrollBar = new Subject<void>();
  protected $updateScrollBar = this._$updateScrollBar.asObservable();

  private _$scroll = new Subject<boolean>();
  readonly $scroll = this._$scroll.asObservable();

  private _$scrollEnd = new Subject<boolean>();
  readonly $scrollEnd = this._$scrollEnd.asObservable();

  private _scrollBox = new ScrollBox();

  get scrollable() {
    const { width, height } = this._$viewportBounds.getValue(),
      isVertical = this._$isVertical.getValue(),
      viewportSize = isVertical ? height : width,
      totalSize = this._totalSize;
    return totalSize > viewportSize;
  }

  get host() {
    return this.scrollViewport?.nativeElement;
  }

  private _prepared = false;
  set prepared(v: boolean) {
    if (this._prepared !== v) {
      this._prepared = v;
      this._$preparedSignal.next(v);
    }
  }

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

  private _totalSize: number = 0;
  set totalSize(v: number) {
    this._totalSize = v;
  }

  get actualScrollHeight() {
    const { height: viewportHeight } = this._$viewportBounds.getValue(),
      totalSize = this._totalSize,
      isVertical = this._$direction.getValue() === VERTICAL;
    return isVertical ? totalSize < viewportHeight ? 0 : totalSize - viewportHeight : this.scrollHeight;
  }

  get actualScrollWidth() {
    const { width: viewportWidth } = this._$viewportBounds.getValue(),
      totalSize = this._totalSize,
      isVertical = this._$direction.getValue() === VERTICAL;
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
    const { width: viewportWidth } = this._$viewportBounds.getValue(),
      actualViewportWidth = viewportWidth,
      { width: contentWidth } = this._$contentBounds.getValue();
    return contentWidth < actualViewportWidth ? 0 : (contentWidth - actualViewportWidth);
  }

  get scrollHeight() {
    const { height: viewportHeight } = this._$viewportBounds.getValue(),
      actualViewportHeight = viewportHeight,
      { height: contentHeight } = this._$contentBounds.getValue();
    return contentHeight < actualViewportHeight ? 0 : (contentHeight - actualViewportHeight);
  }

  private _velocity: number = 0;

  private _$viewportBounds = new BehaviorSubject<ISize>({ width: 0, height: 0 });
  readonly $viewportBounds = this._$viewportBounds.asObservable();

  private _$contentBounds = new BehaviorSubject<ISize>({ width: 0, height: 0 });
  readonly $contentBounds = this._$contentBounds.asObservable();

  private _viewportResizeObserver: ResizeObserver;

  private _onResizeViewportHandler = () => {
    const viewport = this.scrollViewport?.nativeElement;
    if (viewport) {
      this._$viewportBounds.next({ width: viewport.offsetWidth, height: viewport.offsetHeight });
      this.updateScrollBar();
    }
  }

  private _contentResizeObserver: ResizeObserver;

  private _onResizeContentHandler = () => {
    const content = this.scrollContent?.nativeElement;
    if (content) {
      this._$contentBounds.next({ width: content.offsetWidth, height: content.offsetHeight });
      this.updateScrollBar();
    }
  }

  private _updateScrollBarId: number | undefined;

  private _animationId: number = -1;

  private _animationId1: number = -1;

  constructor(private _service: NgVirtualListService) {
    super();

    this._service.$langTextDir.pipe(
      tap(v => {
        this._$langTextDir.next(v);
      })
    ).subscribe();

    this._viewportResizeObserver = new ResizeObserver(this._onResizeViewportHandler);
    this._contentResizeObserver = new ResizeObserver(this._onResizeContentHandler);

    this.$direction.pipe(
      takeUntil(this._$unsubscribe),
      tap(direction => {
        this._$isVertical.next(direction === ScrollerDirection.VERTICAL);
      }),
    ).subscribe();

    const $viewport = this.$viewInitialized.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      switchMap(() => of(this.scrollViewport).pipe(
        filter(v => !!v),
        map(v => v!.nativeElement),
      )),
    ),
      $content = this.$viewInitialized.pipe(
        takeUntil(this._$unsubscribe),
        filter(v => !!v),
        switchMap(() => of(this.scrollContent).pipe(
          filter(v => !!v),
          map(v => v!.nativeElement),
        )),
      ),
      $updateScrollBar = this.$updateScrollBar;

    const updateScrollBarHandler = () => {
      const direction = this._$direction.getValue(),
        isVertical = this._$isVertical.getValue(),
        startOffset = this._$startOffset.getValue(),
        endOffset = this._$endOffset.getValue(),
        scrollContent = this.scrollContent?.nativeElement as HTMLElement,
        scrollViewport = this.scrollViewport?.nativeElement as HTMLDivElement,
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
          minSize: this._$scrollbarMinSize.getValue(),
        });

      this._$thumbGradientPositions.next(thumbGradientPositions);
      this._$thumbSize.next(thumbSize);
      this._$thumbPosition.next(thumbPosition);
      this._$thumbShow.next(isVertical ? this.scrollHeight > 0 : this.scrollWidth > 0);
    };

    const updateScrollBarRAFHandler = (time: DOMHighResTimeStamp) => {
      updateScrollBarHandler();
    };

    $updateScrollBar.pipe(
      takeUntil(this._$unsubscribe),
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
      takeUntil(this._$unsubscribe),
      tap(viewport => {
        this._viewportResizeObserver.observe(viewport);
        this._onResizeViewportHandler();
      }),
    ).subscribe();

    $content.pipe(
      takeUntil(this._$unsubscribe),
      tap(content => {
        this._contentResizeObserver.observe(content);
        this._onResizeContentHandler();
      }),
    ).subscribe();

    $content.pipe(
      takeUntil(this._$unsubscribe),
      switchMap(content => {
        return fromEvent<WheelEvent>(content, WHEEL, { passive: false }).pipe(
          takeUntil(this._$unsubscribe),
          tap(e => {
            const isVertical = this._$isVertical.getValue();
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
      takeUntil(this._$unsubscribe),
    ),
      $mouseDragCancel = $mouseUp.pipe(
        takeUntil(this._$unsubscribe),
        tap(() => {
          this._isMoving = false;
          this._$grabbing.next(false);
        }),
      );

    $content.pipe(
      takeUntil(this._$unsubscribe),
      switchMap(content => {
        return fromEvent<MouseEvent>(content, MOUSE_DOWN, { passive: false }).pipe(
          takeUntil(this._$unsubscribe),
          switchMap(e => {
            if (this.scrollBar) {
              this.scrollBar.stopScrolling();
            }
            this.stopScrolling();
            const target = e.target as HTMLElement;
            if (target.classList.contains(INTERACTIVE)) {
              return of(undefined);
            }
            const isVertical = this._$isVertical.getValue();
            this._isMoving = true;
            this._$grabbing.next(true);
            const startPos = isVertical ? this.y : this.x;
            let prevPos = startPos, prevClientPosition = 0, startPosDelta = 0;
            const startClientPos = isVertical ? e.clientY : e.clientX,
              offsets = new Array<[number, number]>(), velocities = new Array<[number, number]>();
            let startTime = Date.now();
            return fromEvent<MouseEvent>(window, MOUSE_MOVE, { passive: false }).pipe(
              takeUntil(this._$unsubscribe),
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
                  takeUntil(this._$unsubscribe),
                  tap(e => {
                    e.preventDefault();
                    const endTime = Date.now(),
                      timestamp = endTime - startTime,
                      { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp),
                      { a0 } = this.calculateAcceleration(velocities, v0, timestamp);
                    this._isMoving = false;
                    this._$grabbing.next(false);
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
      takeUntil(this._$unsubscribe),
    ),
      $touchCanceler = $touchUp.pipe(
        takeUntil(this._$unsubscribe),
        tap(() => {
          this._isMoving = false;
          this._$grabbing.next(false);
        }),
      );

    $content.pipe(
      takeUntil(this._$unsubscribe),
      switchMap(content => {
        return fromEvent<TouchEvent>(content, TOUCH_START, { passive: false }).pipe(
          takeUntil(this._$unsubscribe),
          switchMap(e => {
            if (this.scrollBar) {
              this.scrollBar.stopScrolling();
            }
            this.stopScrolling();
            const target = e.target as HTMLElement;
            if (target.classList.contains(INTERACTIVE)) {
              return of(undefined);
            }
            const isVertical = this._$isVertical.getValue();
            this._isMoving = true;
            this._$grabbing.next(true);
            const startPos = isVertical ? this.y : this.x;
            let prevPos = startPos, prevClientPosition = 0, startPosDelta = 0;
            const startClientPos = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX,
              offsets = new Array<[number, number]>(), velocities = new Array<[number, number]>();
            let startTime = Date.now();
            return fromEvent<TouchEvent>(window, TOUCH_MOVE, { passive: false }).pipe(
              takeUntil(this._$unsubscribe),
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
                  takeUntil(this._$unsubscribe),
                  tap(e => {
                    e.preventDefault();
                    const endTime = Date.now(),
                      timestamp = endTime - startTime,
                      { v0 } = this.calculateVelocity(offsets, scrollDelta, timestamp),
                      { a0 } = this.calculateAcceleration(velocities, v0, timestamp);
                    this._isMoving = false;
                    this._$grabbing.next(false);
                    this.moveWithAcceleration(isVertical, position, this._velocity, v0, a0);
                  }),
                );
              }),
            );
          })
        );
      }),
    ).subscribe();

    combineLatest([this.$classes, this.$direction, this.$grabbing]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([classes, direction, grabbing]) => {
        this._$actualClasses.next({ ...classes, [direction]: true, grabbing });
        this._$containerClasses.next({ [direction]: true, grabbing });
      }),
    ).subscribe();
  }

  ngAfterViewInit(): void {
    this.afterViewInit();
  }

  private afterViewInit() {
    this._$viewInitialized.next(true);
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
    cancelAnimationFrame(this._animationId);
    cancelAnimationFrame(this._animationId1);
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
    const startTime = getStartTime(), isVertical = this._$direction.getValue() === ScrollerDirection.VERTICAL;
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
      isFinished = false;

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

      const scrollContent = this.scrollContent?.nativeElement as HTMLDivElement;
      if (!!scrollContent) {
        cancelAnimationFrame(this._animationId1);
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
        this._animationId = requestAnimationFrame(step);
      }
    };

    this._animationId = requestAnimationFrame(step);
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
      scrollContent = this.scrollContent?.nativeElement as HTMLDivElement,
      isVertical = this._$direction.getValue() === ScrollerDirection.VERTICAL;

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

          this.fireScrollEvent(userAction);
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

          this.fireScrollEvent(userAction);
        }
      }
    }
  }

  protected fireScrollEvent(userAction: boolean) {
    cancelAnimationFrame(this._animationId1);
    this._animationId1 = requestAnimationFrame(() => {
      this._$scroll.next(userAction);
    });
  }

  reset() {
    if (this.scrollBar) {
      this.scrollBar.stopScrolling();
    }
    this.move(this._$isVertical.getValue(), 0);
  }

  onScrollBarDragHandler(e: any) {
    const position = e as number;
    this._isMoving = true;
    const isVertical = this._$isVertical.getValue(),
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

  override ngOnDestroy(): void {
    super.ngOnDestroy();

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
