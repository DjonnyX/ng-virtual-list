import { Component, EventEmitter, inject, Input, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, from, Subject, takeUntil, tap } from 'rxjs';
import { ScrollBox } from './utils';
import { Id } from '../../types';
import { NgScrollBarComponent } from "../ng-scroll-bar/ng-scroll-bar.component";
import { GradientColorPositions } from '../../types/gradient-color-positions';
import {
  BEHAVIOR_INSTANT, DEFAULT_SCROLLBAR_ENABLED, DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_SCROLLBAR_MIN_SIZE, DEFAULT_SCROLLBAR_THICKNESS, LEFT_PROP_NAME,
  SCROLLER_SCROLL, TOP_PROP_NAME,
} from '../../const';
import { TextDirection, TextDirections } from '../../enums';
import { NgVirtualListService } from '../../ng-virtual-list.service';
import { IScrollToParams, NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { IScrollBarDragEvent } from '../ng-scroll-bar/interfaces';
import { MAX_ITERATIONS_FOR_AVERAGE_CALCULATIONS, MEASURE_VELOCITY_TIMER } from './const';
import { SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO } from '../ng-scroll-view/const';
import { ISize } from '../../interfaces';

const TOP = 'top',
  LEFT = 'left',
  INSTANT = 'instant' as ScrollBehavior;

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL);

/**
 * The scroller for the NgVirtualList item component
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/components/ng-scroller/ng-scroller.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroller',
  templateUrl: './ng-scroller.component.html',
  styleUrls: ['./ng-scroller.component.scss'],
  providers: [
    { provide: SCROLL_VIEW_INVERSION, useValue: false },
    { provide: SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, useValue: true },
  ],
})
export class NgScrollerComponent extends NgScrollView implements OnDestroy {
  @ViewChild('scrollBar', { read: NgScrollBarComponent })
  readonly scrollBar: NgScrollBarComponent | undefined;

  @Output()
  readonly onScrollbarVisible = new EventEmitter<boolean>();

  private _$scrollbarEnabled = new BehaviorSubject<boolean>(DEFAULT_SCROLLBAR_ENABLED);
  readonly $scrollbarEnabled = this._$scrollbarEnabled.asObservable();

  @Input()
  set scrollbarEnabled(v: boolean) {
    if (this._$scrollbarEnabled.getValue() !== v) {
      this._$scrollbarEnabled.next(v);
    }
  }
  get scrollbarEnabled() { return this._$scrollbarEnabled.getValue(); }

  private _$scrollbarInteractive = new BehaviorSubject<boolean>(DEFAULT_SCROLLBAR_INTERACTIVE);
  readonly $scrollbarInteractive = this._$scrollbarInteractive.asObservable();

  @Input()
  set scrollbarInteractive(v: boolean) {
    if (this._$scrollbarInteractive.getValue() !== v) {
      this._$scrollbarInteractive.next(v);
    }
  }
  get scrollbarInteractive() { return this._$scrollbarInteractive.getValue(); }

  private _$focusedElement = new BehaviorSubject<Id | undefined>(undefined);
  readonly $focusedElement = this._$focusedElement.asObservable();

  @Input()
  set focusedElement(v: Id | undefined) {
    if (this._$focusedElement.getValue() !== v) {
      this._$focusedElement.next(v);
    }
  }
  get focusedElement() { return this._$focusedElement.getValue(); }

  private _$content = new BehaviorSubject<HTMLElement | undefined>(undefined);
  readonly $content = this._$focusedElement.asObservable();

  @Input()
  set content(v: HTMLElement | undefined) {
    if (this._$content.getValue() !== v) {
      this._$content.next(v);
    }
  }
  get content() { return this._$content.getValue(); }

  private _$loading = new BehaviorSubject<boolean>(false);
  readonly $loading = this._$loading.asObservable();

  @Input()
  set loading(v: boolean) {
    if (this._$loading.getValue() !== v) {
      this._$loading.next(v);
    }
  }
  get loading() { return this._$loading.getValue(); }

  private _$classes = new BehaviorSubject<{ [cName: string]: boolean }>({});
  readonly $classes = this._$classes.asObservable();

  @Input()
  set classes(v: { [cName: string]: boolean }) {
    if (this._$classes.getValue() !== v) {
      this._$classes.next(v);
    }
  }
  get classes() { return this._$classes.getValue(); }

  private _$scrollbarMinSize = new BehaviorSubject<number>(DEFAULT_SCROLLBAR_MIN_SIZE);
  readonly $scrollbarMinSize = this._$scrollbarMinSize.asObservable();

  @Input()
  set scrollbarMinSize(v: number) {
    if (this._$scrollbarMinSize.getValue() !== v) {
      this._$scrollbarMinSize.next(v);
    }
  }
  get scrollbarMinSize() { return this._$scrollbarMinSize.getValue(); }

  private _$scrollbarThickness = new BehaviorSubject<number>(DEFAULT_SCROLLBAR_THICKNESS);
  readonly $scrollbarThickness = this._$scrollbarThickness.asObservable();

  @Input()
  set scrollbarThickness(v: number) {
    if (this._$scrollbarThickness.getValue() !== v) {
      this._$scrollbarThickness.next(v);
    }
  }
  get scrollbarThickness() { return this._$scrollbarThickness.getValue(); }

  private _$scrollbarThumbRenderer = new BehaviorSubject<TemplateRef<any> | null>(null);
  readonly $scrollbarThumbRenderer = this._$scrollbarThumbRenderer.asObservable();

  @Input()
  set scrollbarThumbRenderer(v: TemplateRef<any> | null) {
    if (this._$scrollbarThumbRenderer.getValue() !== v) {
      this._$scrollbarThumbRenderer.next(v);
    }
  }
  get scrollbarThumbRenderer() { return this._$scrollbarThumbRenderer.getValue(); }

  private _$scrollbarThumbParams = new BehaviorSubject<{ [propName: string]: any } | null>(null);
  readonly $scrollbarThumbParams = this._$scrollbarThumbParams.asObservable();

  @Input()
  set scrollbarThumbParams(v: { [propName: string]: any } | null) {
    if (this._$scrollbarThumbParams.getValue() !== v) {
      this._$scrollbarThumbParams.next(v);
    }
  }
  get scrollbarThumbParams() { return this._$scrollbarThumbParams.getValue(); }

  private _$actualClasses = new BehaviorSubject<{ [cName: string]: boolean }>({});
  readonly $actualClasses = this._$actualClasses.asObservable();

  private _$containerClasses = new BehaviorSubject<{ [cName: string]: boolean }>({});
  readonly $containerClasses = this._$containerClasses.asObservable();

  private _$thumbGradientPositions = new BehaviorSubject<GradientColorPositions>([0, 0]);
  readonly $thumbGradientPositions = this._$thumbGradientPositions.asObservable();

  private _$thumbSize = new BehaviorSubject<number>(0);
  readonly $thumbSize = this._$thumbSize.asObservable();

  private _$thumbColorPositions = new BehaviorSubject<GradientColorPositions>([0, 0]);
  readonly $thumbColorPositions = this._$thumbColorPositions.asObservable();

  private _$actualThumbSize = new BehaviorSubject<number>(0);
  readonly $actualThumbSize = this._$actualThumbSize.asObservable();

  private _$scrollbarShow = new BehaviorSubject<boolean>(false);
  readonly $scrollbarShow = this._$scrollbarShow.asObservable();

  private _$show = new BehaviorSubject<boolean>(false);
  readonly $show = this._$show.asObservable();


  private _$preparedSignal = new BehaviorSubject<boolean>(false);
  readonly $preparedSignal = this._$preparedSignal.asObservable();

  private _service = inject(NgVirtualListService);

  private _$langTextDir = new BehaviorSubject<TextDirection>(TextDirections.LTR);
  readonly $langTextDir = this._$langTextDir.asObservable();

  private _scrollBox = new ScrollBox();

  get host() {
    return this.scrollViewport?.nativeElement;
  }

  private _$scrollbarScroll = new Subject<boolean>();
  readonly $scrollbarScroll = this._$scrollbarScroll.asObservable();

  private _prepared = false;
  set prepared(v: boolean) {
    if (this._prepared !== v) {
      this._prepared = v;
      this._$preparedSignal.next(v);
    }
  }

  override set x(v: number) {
    if (v !== undefined && !Number.isNaN(v)) {
      this._x = this._actualX = v;

      this.measureVelocity();

      this.updateScrollBar();
    }
  }
  override get x() { return this._x; }

  override set y(v: number) {
    if (v !== undefined && !Number.isNaN(v)) {
      this._y = this._actualY = v;

      this.measureVelocity();

      this.updateScrollBar();
    }
  }
  override get y() { return this._y; }

  private _isScrollbarUserAction: boolean = false;
  get isScrollbarUserAction() {
    return this._isScrollbarUserAction;
  }

  private _measureVelocityTimestamp: number = Date.now();

  private _measureVelocityLastPosition: number = this._$isVertical.getValue() ? this._y : this._x;

  private _measureVelocityAnimationFrameId: number = -1;

  private _measureVelocityAnimationTimer: number = -1;

  private _velocities: Array<number> = [];

  protected _velocity: number = 0;
  get velocity() { return this._velocity; }

  protected _averageVelocity: number = 0;
  get averageVelocity() { return this._averageVelocity; }

  private _measureVelocityHandler = () => {
    this.measureVelocityExecutor();
  }

  protected _$resizeViewport = new Subject<ISize>();
  readonly $resizeViewport = this._$resizeViewport.asObservable();

  protected _$resizeContent = new Subject<ISize>();
  readonly $resizeContent = this._$resizeContent.asObservable();

  constructor() {
    super();

    this._service.$langTextDir.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(v => {
        this._$langTextDir.next(v);
      }),
    ).subscribe();

    this.$thumbGradientPositions.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(v => {
        this._$thumbColorPositions.next(v);
      }),
    ).subscribe();

    this.$thumbSize.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(v => {
        this._$actualThumbSize.next(v);
      }),
    ).subscribe();
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    const $prepared = this.$preparedSignal;
    $prepared.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(() => {
        this.updateScrollBarHandler(true, false, true);
      }),
    ).subscribe();

    const $scrollbarEnabled = this.$scrollbarEnabled,
      $scrollbarShow = this.$scrollbarShow;

    combineLatest([$scrollbarEnabled, $scrollbarShow, $prepared]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([scrollbarEnabled, scrollbarShow, prepared]) => {
        this._$show.next(scrollbarEnabled && scrollbarShow && prepared);
      }),
    ).subscribe();

    const $startOffset = this.$startOffset,
      $endOffset = this.$endOffset,
      $scrollbarMinSize = this.$scrollbarMinSize,
      $isVertical = this.$isVertical,
      $thumbSize = this.$thumbSize;

    from([$endOffset, $startOffset, $thumbSize, $scrollbarMinSize, $isVertical]).pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(() => {
        this.updateScrollBar();
      }),
    ).subscribe();

    const $updateScrollBar = this.$updateScrollBar;

    $updateScrollBar.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(() => {
        this.updateScrollBarHandler(!this._isScrollbarUserAction);
      }),
    ).subscribe();

    combineLatest([this.$classes, this.$direction, this.$grabbing]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      debounceTime(0),
      tap(([classes, direction, grabbing]) => {
        this._$actualClasses.next({ ...classes, [direction]: true, grabbing });
      }),
    ).subscribe();

    combineLatest([this.$contentBounds, this.$viewportBounds, this.$isVertical, this.$direction, this.$grabbing, this.$scrollbarEnabled]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      debounceTime(0),
      tap(([contentBounds, viewportBounds, isVertical, direction, grabbing, scrollbarEnabled]) => {
        const { width: contentWidth, height: contentHeight } = contentBounds,
          { width, height } = viewportBounds,
          viewportSize = isVertical ? height : width,
          contentSize = isVertical ? contentHeight : contentWidth;
        this._$containerClasses.next({ [direction]: true, grabbing, enabled: scrollbarEnabled, scrollable: contentSize > viewportSize });
      }),
    ).subscribe();

    this.updateScrollBarHandler();
    this.runMeasureVelocity();
  }

  protected override onResizeViewport() {
    const viewport = this.scrollViewport?.nativeElement;
    if (viewport) {
      const bounds: ISize = { width: viewport.offsetWidth, height: viewport.offsetHeight }, b = this._$viewportBounds.getValue();
      if (bounds.width === b.width && bounds.height === b.height) {
        return;
      }
      this._$viewportBounds.next(bounds);
      this.updateScrollBar();
      this._$resizeViewport.next(bounds);
    }
  }

  protected override onResizeContent() {
    const content = this.scrollContent?.nativeElement;
    if (content) {
      const bounds: ISize = { width: content.offsetWidth, height: content.offsetHeight }, b = this._$contentBounds.getValue();
      if (bounds.width === b.width && bounds.height === b.height) {
        return;
      }
      this._$contentBounds.next(bounds);
      this.updateScrollBar();
      this._$resizeContent.next(bounds);
    }
  }

  private measureVelocity() {
    this._measureVelocityAnimationTimer = MEASURE_VELOCITY_TIMER;

    this.measureVelocityExecutor();
  };

  private measureVelocityExecutor() {
    const timestamp = Date.now();
    if (timestamp === this._measureVelocityTimestamp) {
      return;
    }
    const position = Math.abs(this._$isVertical.getValue() ? this._y : this._x);
    const timeDelta = timestamp - this._measureVelocityTimestamp,
      positionDelta = Math.abs(position - this._measureVelocityLastPosition),
      velocity = timeDelta > 0 ? positionDelta / timeDelta : 0;
    let avgVelocity = this._velocities.length > 0 ? this._velocities.reduce((p, c) => p + c) : 0;
    if (this._velocities.length >= MAX_ITERATIONS_FOR_AVERAGE_CALCULATIONS) {
      this._velocities.shift();
    }
    avgVelocity += velocity;
    this._velocity = velocity;
    this._velocities.push(velocity);
    this._averageVelocity = avgVelocity / MAX_ITERATIONS_FOR_AVERAGE_CALCULATIONS;
    this._measureVelocityLastPosition = position;
    this._measureVelocityTimestamp = timestamp;

    this.runMeasureVelocity();
  }

  stopMeasureVelocity() {
    if (this._measureVelocityAnimationFrameId > -1) {
      cancelAnimationFrame(this._measureVelocityAnimationFrameId);
      this._measureVelocityAnimationFrameId = -1;
    }
  }

  private runMeasureVelocity() {
    this.stopMeasureVelocity();
    if (this._measureVelocityAnimationTimer >= 0) {
      this._measureVelocityAnimationTimer--;
      this._measureVelocityAnimationFrameId = requestAnimationFrame(this._measureVelocityHandler);
    }
  }

  private updateScrollBarHandler(update: boolean = false, blending: boolean = true, fireUpdate: boolean = false) {
    const direction = this._$direction.getValue(),
      isVertical = this._$isVertical.getValue(),
      viewportBounds = this._$viewportBounds.getValue(),
      contentBounds = this._$contentBounds.getValue(),
      startOffset = this._$startOffset.getValue(),
      endOffset = this._$endOffset.getValue(),
      {
        thumbSize,
        thumbPosition,
        thumbGradientPositions,
      } = this._scrollBox.calculateScroll({
        direction,
        viewportWidth: viewportBounds.width,
        viewportHeight: viewportBounds.height,
        contentWidth: contentBounds.width,
        contentHeight: contentBounds.height,
        startOffset,
        endOffset,
        positionX: this._x,
        positionY: this._y,
        minSize: this._$scrollbarMinSize.getValue(),
      });

    this._$thumbGradientPositions.next(thumbGradientPositions);
    this._$thumbSize.next(thumbSize);
    const actualThumbPosition = thumbPosition < startOffset ? startOffset : thumbPosition;
    if (update) {
      this.scrollBar?.scroll({
        [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualThumbPosition, fireUpdate, behavior: BEHAVIOR_INSTANT,
        userAction: false, blending,
      });
    }
    this._$scrollbarShow.next(this.scrollable && this._$scrollbarEnabled.getValue());
  };

  override tick() {
    super.tick();

    this.scrollBar?.tick();
  }

  private updateScrollBar() {
    this._$updateScrollBar.next();
  }

  refreshScrollbar() {
    this.updateScrollBarHandler(true, false, false);
  }

  protected override onDragStart() {
    super.onDragStart();

    this.stopScrollbar();

    this._isScrollbarUserAction = false;

    this.updateScrollBar();
  }

  override reset() {
    super.reset(this._$startOffset.getValue());
    this.totalSize = 0;
    this.stopScrollbar();
    this.refresh(true, true);
    this.prepared = false;
  }

  refresh(fireUpdate: boolean = false, updateScrollbar: boolean = true) {
    if (updateScrollbar) {
      this.stopScrolling();
    }

    this.scrollLimits();

    if (this._$isVertical.getValue()) {
      this.refreshY(this._y);
    } else {
      this.refreshX(this._x);
    }

    if (updateScrollbar) {
      this.updateScrollBarHandler(false);
      this.emitScrollableEvent();
    }

    if (fireUpdate) {
      this.fireScrollEvent(false);
    }
  }

  scrollTo(params: IScrollToParams) {
    const userAction = params.userAction ?? true;
    if (userAction) {
      this._isScrollbarUserAction = false;
      this.scrollBar?.stopScrolling();
    }
    this.scroll({ ...params, userAction: userAction });
  }

  stopScrollbar() {
    if (!!this.scrollBar) {
      this.scrollBar.stopScrolling();
    }
  }

  protected override onAnimationComplete(position: number) {
    this._velocities = [0];
    this._velocity = 0;
    this._$scrollEnd.next(false);
  }

  onScrollBarDragHandler(event: IScrollBarDragEvent) {
    const { position, min, max, userAction } = event;
    this._isScrollbarUserAction = userAction;
    if (!userAction) {
      return;
    }
    this._$scrollbarScroll.next(userAction);
    this.stopScrolling();
    const isVertical = this._$isVertical.getValue(),
      {
        position: absolutePosition,
      } = this._scrollBox.getScrollPositionByScrollBar({
        scrollSize: isVertical ? this.scrollHeight : this.scrollWidth,
        position,
      });

    this.scrollTo({
      [isVertical ? TOP : LEFT]: absolutePosition, behavior: INSTANT,
      blending: false, userAction: false, fireUpdate: true,
    });
    this.emitScrollableEvent();
    this.fireUpdateIfEdgesDetected(position, min, max, true, true);
  }

  onScrollBarDragEndHandler(event: IScrollBarDragEvent) {
    const { position, min, max, userAction } = event;
    this._isScrollbarUserAction = false;
    this._velocities = [0];
    this._velocity = 0;
    if (!userAction) {
      return;
    }
    this.refresh(true, true);
    this.fireUpdateIfEdgesDetected(position, min, max, true, true);
    this._$scrollbarScroll.next(false);
    this.fireScrollEvent(false);
  }

  private fireUpdateIfEdgesDetected(position: number, min: number = 0, max: number = 1, animation: boolean = false, userAction: boolean = false) {
    if (userAction && animation) {
      if (position <= min) {
        this._service.scrollToStart();
      } else if (position >= max) {
        this._service.scrollToEnd();
      }
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();

    this.stopMeasureVelocity();
  }
}