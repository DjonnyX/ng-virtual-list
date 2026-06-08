import { Component, ElementRef, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, from, of, Subject, takeUntil, tap } from 'rxjs';
import { ScrollBox } from './utils';
import { Id, TextDirection } from '../../types';
import { NgScrollBarComponent } from "../ng-scroll-bar/ng-scroll-bar.component";
import { GradientColorPositions } from '../../types/gradient-color-positions';
import {
  BEHAVIOR_INSTANT, DEFAULT_MAX_MOTION_BLUR, DEFAULT_MOTION_BLUR, DEFAULT_MOTION_BLUR_ENABLED, DEFAULT_OVERLAPPING_SCROLLBAR, DEFAULT_SCROLLBAR_ENABLED,
  DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_SCROLLBAR_MIN_SIZE, DEFAULT_SCROLLBAR_THICKNESS, LEFT_PROP_NAME, PX, SCROLLER_SCROLL, TOP_PROP_NAME,
} from '../../const';
import { TextDirections } from '../../enums';
import { IScrollToParams, NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { IScrollBarDragEvent } from '../ng-scroll-bar/interfaces';
import { SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, SCROLL_VIEW_OVERSCROLL_ENABLED } from '../ng-scroll-view/const';
import { ISize } from '../../interfaces';

const TOP = 'top',
  LEFT = 'left',
  INSTANT = 'instant' as ScrollBehavior,
  MOTION_BLUR = 'motion-blur';

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL);

/**
 * The scroller for the NgVirtualList item component
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/components/ng-scroller/ng-scroller.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroller',
  providers: [
    { provide: SCROLL_VIEW_INVERSION, useValue: false },
    { provide: SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, useValue: true },
    { provide: SCROLL_VIEW_OVERSCROLL_ENABLED, useValue: true },
  ],
  standalone: false,
  templateUrl: './ng-scroller.component.html',
  styleUrls: ['./ng-scroller.component.scss'],
})
export class NgScrollerComponent extends NgScrollView {
  @ViewChild('scrollBar', { read: NgScrollBarComponent })
  readonly scrollBar: NgScrollBarComponent | undefined;

  @ViewChild('filter')
  readonly filter: ElementRef<SVGFEGaussianBlurElement> | undefined;

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

  private _$overlappingScrollbar = new BehaviorSubject<boolean>(DEFAULT_OVERLAPPING_SCROLLBAR);
  readonly $overlappingScrollbar = this._$overlappingScrollbar.asObservable();

  @Input()
  set overlappingScrollbar(v: boolean) {
    if (this._$overlappingScrollbar.getValue() !== v) {
      this._$overlappingScrollbar.next(v);
    }
  }
  get overlappingScrollbar() { return this._$overlappingScrollbar.getValue(); }

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

  private _$motionBlur = new BehaviorSubject<number | 'disabled'>(DEFAULT_MOTION_BLUR);
  readonly $motionBlur = this._$motionBlur.asObservable();

  @Input()
  set motionBlur(v: number | 'disabled') {
    if (this._$motionBlur.getValue() !== v) {
      this._$motionBlur.next(v);
    }
  }
  get motionBlur() { return this._$motionBlur.getValue(); }

  private _$maxMotionBlur = new BehaviorSubject<number>(DEFAULT_MAX_MOTION_BLUR);
  readonly $maxMotionBlur = this._$maxMotionBlur.asObservable();

  @Input()
  set maxMotionBlur(v: number) {
    if (this._$maxMotionBlur.getValue() !== v) {
      this._$maxMotionBlur.next(v);
    }
  }
  get maxMotionBlur() { return this._$maxMotionBlur.getValue(); }

  private _$motionBlurEnabled = new BehaviorSubject<boolean>(DEFAULT_MOTION_BLUR_ENABLED);
  readonly $motionBlurEnabled = this._$motionBlurEnabled.asObservable();

  @Input()
  set motionBlurEnabled(v: boolean) {
    if (this._$motionBlurEnabled.getValue() !== v) {
      this._$motionBlurEnabled.next(v);
    }
  }
  get motionBlurEnabled() { return this._$motionBlurEnabled.getValue(); }

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

  private _$langTextDir = new BehaviorSubject<TextDirection>(TextDirections.LTR);
  readonly $langTextDir = this._$langTextDir.asObservable();

  private _$listStyles = new BehaviorSubject<{ perspectiveOrigin: string }>({ perspectiveOrigin: 'center' });
  readonly $listStyles = this._$listStyles.asObservable();

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

  protected override setX(x: number, snap: boolean = true, normalize: boolean = true) {
    if (x !== undefined && !Number.isNaN(x)) {
      this.updateDirection(x, this._x);

      this._x = this._actualX = x;

      const overridden = normalize ? this.normalizeScrollSize() : false;

      this.refreshCoordinate(this._x, this._y);

      if (!overridden) {
        this.measureVelocity();
      }

      this.updateScrollBar();

      this.recalculatePerspective();

      if (snap) {
        this.checkIntersectionComponent();
      }
    }
  }

  protected override setY(y: number, snap: boolean = true, normalize: boolean = true) {
    if (y !== undefined && !Number.isNaN(y)) {
      this.updateDirection(y, this._y);

      this._y = this._actualY = y;

      const overridden = normalize ? this.normalizeScrollSize() : false;

      this.refreshCoordinate(this._x, this._y);

      if (!overridden) {
        this.measureVelocity();
      }

      this.updateScrollBar();

      this.recalculatePerspective();

      if (snap) {
        this.checkIntersectionComponent();
      }
    }
  }

  override set startLayoutOffset(v: number) {
    if (this._startLayoutOffset !== v) {
      this._startLayoutOffset = v;

      this.refreshCoordinate(this._x, this._y);

      this.recalculatePerspective();
    }
  }
  override get startLayoutOffset() { return this._startLayoutOffset; }

  private _$viewInitialized = new BehaviorSubject<boolean>(false);
  readonly $viewInitialized = this._$viewInitialized.asObservable();

  private _isScrollbarUserAction: boolean = false;
  get isScrollbarUserAction() {
    return this._isScrollbarUserAction;
  }

  protected _$resizeViewport = new Subject<ISize>();
  readonly $resizeViewport = this._$resizeViewport.asObservable();

  protected _$resizeContent = new Subject<ISize>();
  readonly $resizeContent = this._$resizeContent.asObservable();

  protected _filterId: string;

  protected _filter: string;

  constructor() {
    super();

    this._filterId = `${this._service.id}-${MOTION_BLUR}`;
    this._filter = `url(#${this._filterId})`;
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    const $filter = of(this.filter),
      $motionBlur = this.$motionBlur,
      $maxMotionBlur = this.$maxMotionBlur,
      $motionBlurEnabled = this.$motionBlurEnabled,
      $isVertical = this.$isVertical;

    const $scrollbarScroll = this.$scrollbarScroll;
    $scrollbarScroll.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(50),
      tap(() => {
        this.dropVelocity();
        this.fireScrollEvent(false);
      }),
    ).subscribe();

    const $averageVelocity = this.$averageVelocity;
    combineLatest([$isVertical, $averageVelocity, $filter, $motionBlurEnabled, $motionBlur, $maxMotionBlur]).pipe(
      takeUntil(this._$unsubscribe),
      filter(([, , f, e, mb]) => !!f && (!!e && mb !== 0)),
      tap(([isVertical, v, filter, , mb, mbMax]) => {
        const _v = v * (mb as number), value = _v > mbMax ? mbMax : _v;
        filter!.nativeElement.setStdDeviation(isVertical ? 0 : v * value, isVertical ? v * value : 0);
      }),
      debounceTime(50),
      tap(([, , filter, ,]) => {
        filter!.nativeElement.setStdDeviation(0, 0);
      }),
    ).subscribe();

    this._service.$langTextDir.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(v => {
        this._$langTextDir.next(v);
      })
    ).subscribe();

    const $prepare = this.$preparedSignal;
    $prepare.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(() => {
        this.updateScrollBarHandler(true, false, true);
      }),
    ).subscribe();

    const $scrollbarEnabled = this.$scrollbarEnabled,
      $scrollbarShow = this.$scrollbarShow;

    combineLatest([$scrollbarEnabled, $scrollbarShow, this.$preparedSignal]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([scrollbarEnabled, scrollbarShow, prepared]) => {
        this._$show.next(scrollbarEnabled && scrollbarShow && prepared);
      }),
    ).subscribe();

    const $startOffset = this.$startOffset,
      $endOffset = this.$endOffset,
      $scrollbarMinSize = this.$scrollbarMinSize,
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

    combineLatest([this.$classes, this.$direction, this.$grabbing, this.$motionBlurEnabled]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      debounceTime(0),
      tap(([classes, direction, grabbing, filtered]) => {
        this._$actualClasses.next({ ...classes, [direction]: true, grabbing, filtered });
      }),
    ).subscribe();

    combineLatest([this.$contentBounds, this.$viewportBounds, this.$isVertical, this.$direction, this.$grabbing, this.$scrollbarEnabled, this.$overlappingScrollbar]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      debounceTime(0),
      tap(([contentBounds, viewportBounds, isVertical, direction, grabbing, scrollbarEnabled, overlappingScrollbar]) => {
        const { width: contentWidth, height: contentHeight } = contentBounds,
          { width, height } = viewportBounds,
          viewportSize = isVertical ? height : width,
          contentSize = isVertical ? contentHeight : contentWidth;
        this._$containerClasses.next({ [direction]: true, grabbing, enabled: scrollbarEnabled, scrollable: contentSize > viewportSize, overlapping: overlappingScrollbar });
      }),
    ).subscribe();

    this.$viewInitialized.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(() => {
        this.updateScrollBarHandler();
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

    this._$viewInitialized.next(true);
  }

  private recalculatePerspective() {
    const isVertical = this._$isVertical.getValue(), scrollSize = (isVertical ? this.scrollTop : this.scrollLeft) - this._startLayoutOffset,
      { width, height } = this._$viewportBounds.getValue();
    this._$listStyles.next({
      perspectiveOrigin: `${isVertical ? width * .5 : (scrollSize + width * .5)}${PX} ${isVertical ? (scrollSize + height * .5) : height * .5}${PX}`
    });
  }

  protected override onResizeViewport() {
    const viewport = this.scrollViewport?.nativeElement;
    if (!!viewport) {
      const bounds: ISize = { width: viewport.offsetWidth, height: viewport.offsetHeight }, b = this._$viewportBounds.getValue();
      if (bounds.width === b.width && bounds.height === b.height) {
        return;
      }
      this._$viewportBounds.next(bounds);
      this.updateScrollBar();
      this._$resizeViewport.next(bounds);
    }
  }

  protected override onResizeContent(value: number | null = null) {
    const content = this.scrollContent?.nativeElement;
    if (!!content) {
      const isVertical = this._$isVertical.getValue(), bounds: ISize = {
        width: isVertical ? content.offsetWidth : (value ?? content.offsetWidth),
        height: isVertical ? (value ?? content.offsetHeight) : content.offsetHeight
      }, b = this._$contentBounds.getValue();
      if (value === null && bounds.width === b.width && bounds.height === b.height) {
        return;
      }
      this._$contentBounds.next(bounds);
      this.updateScrollBar();
      this._$resizeContent.next(bounds);
    }
  }

  private updateScrollBarHandler(update: boolean = false, blending: boolean = true, fireUpdate: boolean = false) {
    const direction = this.direction,
      isVertical = this._$isVertical.getValue(),
      viewportBounds = this._$viewportBounds.getValue(),
      contentBounds = this._$contentBounds.getValue(),
      startOffset = this.startOffset,
      endOffset = this.endOffset,
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
        minSize: this.scrollbarMinSize,
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
    this._$scrollbarShow.next(this.scrollable && this.scrollbarEnabled);
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
    super.reset();
    this.totalSize = 0;
    this.onResizeContent(0);
    this.stopScrollbar();
    this.refresh(true, true);
    this.prepared = false;
  }

  refresh(fireUpdate: boolean = false, updateScrollbar: boolean = true) {
    if (updateScrollbar) {
      this.stopScrolling();
    }

    this.scrollLimits();

    this.refreshCoordinate(this._x, this._y);

    if (updateScrollbar) {
      this.updateScrollBarHandler(false);
      this.emitScrollableEvent();
    }

    if (fireUpdate) {
      this.fireScrollEvent(false);
    }
  }

  snapIfNeed(animated = true) {
    this.snapWithInitialForceIfNecessary(null, animated, true);
  }

  startScrollTo() {
    this.stopScrollbar();
    this.stopScrolling(true);
    this._scrollDirection.clear();
    this.dropVelocity();
    this._isScrollsTo = true;
  }

  finishedScrollTo() {
    this._isScrollsTo = false;
    this._scrollDirection.clear();
    this.dropVelocity();
    this.checkIntersectionComponent();
    this.fireScrollEvent(true);
  }

  scrollTo(params: IScrollToParams) {
    const userAction = params?.userAction ?? true;
    if (userAction) {
      this._isScrollbarUserAction = false;
      this.scrollBar?.stopScrolling();
    }
    this.scroll({ ...params, userAction: userAction });
  }

  stopScrollbar() {
    if (!!this.scrollBar) {
      this.scrollBar.stopScrolling();
      this.alignPosition();
      this.dropVelocity();
    }
  }

  private dropVelocity() {
    this._velocities = [0];
    this._$velocity.next(0);
    this._$averageVelocity.next(0);
  }

  protected override stopMoving() {
    super.stopMoving();
    this.dropVelocity();
  }

  protected override onAnimationComplete(position: number) {
    this.dropVelocity();
    this._$scrollEnd.next(false);
  }

  onScrollBarDragHandler(event: IScrollBarDragEvent) {
    const { position, min, max, userAction } = event;
    this._isScrollbarUserAction = userAction;
    if (!userAction) {
      return;
    }
    this._$scrollbarScroll.next(true);
    this.stopScrolling(true);
    const isVertical = this._$isVertical.getValue(),
      {
        position: absolutePosition,
      } = this._scrollBox.getScrollPositionByScrollBar({
        scrollSize: isVertical ? this.scrollHeight : this.scrollWidth,
        position,
      });

    this.scrollTo({
      [isVertical ? TOP : LEFT]: absolutePosition, behavior: INSTANT,
      blending: false, userAction: true, fireUpdate: true,
    });
    this.emitScrollableEvent();
    this._service.update(false);
  }

  onScrollBarDragEndHandler(event: IScrollBarDragEvent) {
    const { position, min, max, userAction } = event;
    this._isScrollbarUserAction = userAction;
    if (!userAction) {
      return;
    }
    this._isScrollbarUserAction = false;
    this.dropVelocity();
    this._service.update(false);
    const isEdge = this.fireUpdateIfEdgesDetected(position, min, max, true, true);
    if (!isEdge) {
      this.alignPosition();
    }
    this._scrollDirection.clear();
    this._$scrollbarScroll.next(true);
    this.fireScrollEvent(true);
  }

  private fireUpdateIfEdgesDetected(position: number, min: number = 0, max: number = 1, animation: boolean = false, userAction: boolean = false) {
    if (userAction && animation) {
      if (position <= min) {
        this._service.scrollToStart();
        return true;
      } else if (position >= max) {
        this._service.scrollToEnd();
        return true;
      }
    }
    return false;
  }
}