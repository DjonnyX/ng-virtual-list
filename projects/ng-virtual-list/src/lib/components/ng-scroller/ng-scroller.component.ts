import { Component, computed, effect, ElementRef, input, OnDestroy, output, Signal, signal, TemplateRef, viewChild, ViewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, debounceTime, filter, from, Subject, tap } from 'rxjs';
import { ScrollBox } from './utils';
import { Id, TextDirection } from '../../types';
import { NgScrollBarComponent } from "../ng-scroll-bar/ng-scroll-bar.component";
import { GradientColorPositions } from '../../types/gradient-color-positions';
import {
  BEHAVIOR_INSTANT, DEFAULT_MAX_MOTION_BLUR, DEFAULT_MOTION_BLUR, DEFAULT_MOTION_BLUR_ENABLED, DEFAULT_SCROLLBAR_ENABLED,
  DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_SCROLLBAR_MIN_SIZE, DEFAULT_SCROLLBAR_THICKNESS, LEFT_PROP_NAME, PX, SCROLLER_SCROLL, TOP_PROP_NAME,
} from '../../const';
import { TextDirections } from '../../enums';
import { IScrollToParams, NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { IScrollBarDragEvent } from '../ng-scroll-bar/interfaces';
import { SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, SCROLL_VIEW_OVERSCROLL_ENABLED } from '../ng-scroll-view/const';
import { ISize } from '../../interfaces';

const TOP = 'top',
  LEFT = 'left',
  INSTANT = 'instant',
  MOTION_BLUR = 'motion-blur';

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL);

/**
 * The scroller for the NgVirtualList item component
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/scroller/ng-scroller.component.ts
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
  styleUrl: './ng-scroller.component.scss'
})
export class NgScrollerComponent extends NgScrollView implements OnDestroy {
  @ViewChild('scrollBar', { read: NgScrollBarComponent })
  readonly scrollBar: NgScrollBarComponent | undefined;

  readonly filter = viewChild<ElementRef<SVGFEGaussianBlurElement>>('filter');

  readonly onScrollbarVisible = output<boolean>();

  readonly scrollbarEnabled = input<boolean>(DEFAULT_SCROLLBAR_ENABLED);

  readonly scrollbarInteractive = input<boolean>(DEFAULT_SCROLLBAR_INTERACTIVE);

  readonly focusedElement = input<Id | null>(null);

  readonly content = input<HTMLElement>();

  readonly loading = input<boolean>(false);

  readonly classes = input<{ [cName: string]: boolean }>({});

  readonly scrollbarMinSize = input<number>(DEFAULT_SCROLLBAR_MIN_SIZE);

  readonly scrollbarThickness = input<number>(DEFAULT_SCROLLBAR_THICKNESS);

  readonly scrollbarThumbRenderer = input<TemplateRef<any> | null>(null);

  readonly scrollbarThumbParams = input<{ [propName: string]: any } | null>(null);

  readonly motionBlur = input<number | 'disabled'>(DEFAULT_MOTION_BLUR);

  readonly maxMotionBlur = input<number>(DEFAULT_MAX_MOTION_BLUR);

  readonly motionBlurEnabled = input<boolean>(DEFAULT_MOTION_BLUR_ENABLED);

  public readonly actualClasses: Signal<{ [cName: string]: boolean }>;

  public readonly containerClasses: Signal<{ [cName: string]: boolean }>;

  public readonly thumbGradientPositions = signal<GradientColorPositions>([0, 0]);

  public readonly thumbSize = signal<number>(0);

  public readonly scrollbarShow = signal<boolean>(false);

  public readonly preparedSignal = signal<boolean>(false);

  public readonly langTextDir = signal<TextDirection>(TextDirections.LTR);

  public readonly listStyles = signal<{ perspectiveOrigin: string }>({ perspectiveOrigin: 'center' });

  private _scrollBox = new ScrollBox();

  get host() {
    return this.scrollViewport()?.nativeElement;
  }

  private _$scrollbarScroll = new Subject<boolean>();
  readonly $scrollbarScroll = this._$scrollbarScroll.asObservable();

  private _prepared = false;
  set prepared(v: boolean) {
    if (this._prepared !== v) {
      this._prepared = v;
      this.preparedSignal.set(v);
    }
  }

  override set x(v: number) {
    if (v !== undefined && !Number.isNaN(v)) {
      this.updateDirection(v, this._x);

      this._x = this._actualX = v;

      this.measureVelocity();

      this.updateScrollBar();

      this.recalculatePerspective();
    }
  }
  override get x() { return this._x; }

  override set y(v: number) {
    if (v !== undefined && !Number.isNaN(v)) {
      this.updateDirection(v, this._y);

      this._y = this._actualY = v;

      this.measureVelocity();

      this.updateScrollBar();

      this.recalculatePerspective();
    }
  }
  override get y() { return this._y; }

  readonly viewInitialized = signal<boolean>(false);

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

    const $filter = toObservable(this.filter),
      $motionBlur = toObservable(this.motionBlur),
      $maxMotionBlur = toObservable(this.maxMotionBlur),
      $motionBlurEnabled = toObservable(this.motionBlurEnabled),
      $isVertical = toObservable(this.isVertical);

    const $scrollbarScroll = this.$scrollbarScroll;
    $scrollbarScroll.pipe(
      takeUntilDestroyed(),
      debounceTime(50),
      tap(() => {
        this.dropVelocity();
        this.fireScrollEvent(false);
      }),
    ).subscribe();

    const $averageVelocity = this.$averageVelocity;
    combineLatest([$isVertical, $averageVelocity, $filter, $motionBlurEnabled, $motionBlur, $maxMotionBlur]).pipe(
      takeUntilDestroyed(),
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
      tap(v => {
        takeUntilDestroyed(this._destroyRef),
          this.langTextDir.set(v);
      })
    ).subscribe();

    const $prepare = toObservable(this.preparedSignal);
    $prepare.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap(() => {
        this.updateScrollBarHandler(true, false, true);
      }),
    ).subscribe();

    const $startOffset = toObservable(this.startOffset),
      $endOffset = toObservable(this.endOffset),
      $scrollbarMinSize = toObservable(this.scrollbarMinSize),
      $thumbSize = toObservable(this.thumbSize);

    from([$endOffset, $startOffset, $thumbSize, $scrollbarMinSize, $isVertical]).pipe(
      takeUntilDestroyed(),
      debounceTime(0),
      tap(() => {
        this.updateScrollBar();
      }),
    ).subscribe();

    const $updateScrollBar = this.$updateScrollBar;

    $updateScrollBar.pipe(
      takeUntilDestroyed(this._destroyRef),
      debounceTime(0),
      tap(() => {
        this.updateScrollBarHandler(!this._isScrollbarUserAction);
      }),
    ).subscribe();

    this.actualClasses = computed(() => {
      const classes = this.classes(), direction = this.direction(), filtered = this.motionBlurEnabled();
      return { ...classes, [direction]: true, grabbing: this.grabbing(), filtered };
    });

    this.containerClasses = computed(() => {
      const { width: contentWidth, height: contentHeight } = this.contentBounds(),
        { width, height } = this.viewportBounds(),
        isVertical = this.isVertical(),
        viewportSize = isVertical ? height : width,
        contentSize = isVertical ? contentHeight : contentWidth;
      return { [this.direction()]: true, grabbing: this.grabbing(), enabled: this.scrollbarEnabled(), scrollable: contentSize > viewportSize };
    });

    effect(() => {
      const viewInitialized = this.viewInitialized();
      if (viewInitialized) {
        this.updateScrollBarHandler();
      }
    });
  }

  private recalculatePerspective() {
    const isVertical = this.isVertical(), sxrollSize = isVertical ? this.scrollTop : this.scrollLeft,
      { width, height } = this.viewportBounds();
    this.listStyles.set({
      perspectiveOrigin: `${isVertical ? width * .5 : (sxrollSize + width * .5)}${PX} ${isVertical ? (sxrollSize + height * .5) : height * .5}${PX}`
    });
  }

  protected override onResizeViewport() {
    const viewport = this.scrollViewport()?.nativeElement;
    if (viewport) {
      const bounds: ISize = { width: viewport.offsetWidth, height: viewport.offsetHeight }, b = this.viewportBounds();
      if (bounds.width === b.width && bounds.height === b.height) {
        return;
      }
      this.viewportBounds.set(bounds);
      this.updateScrollBar();
      this._$resizeViewport.next(bounds);
    }
  }

  protected override onResizeContent() {
    const content = this.scrollContent()?.nativeElement;
    if (content) {
      const bounds: ISize = { width: content.offsetWidth, height: content.offsetHeight }, b = this.contentBounds();
      if (bounds.width === b.width && bounds.height === b.height) {
        return;
      }
      this.contentBounds.set(bounds);
      this.updateScrollBar();
      this._$resizeContent.next(bounds);
    }
  }

  private updateScrollBarHandler(update: boolean = false, blending: boolean = true, fireUpdate: boolean = false) {
    const direction = this.direction(),
      isVertical = this.isVertical(),
      viewportBounds = this.viewportBounds(),
      contentBounds = this.contentBounds(),
      startOffset = this.startOffset(),
      endOffset = this.endOffset(),
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
        minSize: this.scrollbarMinSize(),
      });

    this.thumbGradientPositions.set(thumbGradientPositions);
    this.thumbSize.set(thumbSize);
    const actualThumbPosition = thumbPosition < startOffset ? startOffset : thumbPosition;
    if (update) {
      this.scrollBar?.scroll({
        [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: actualThumbPosition, fireUpdate, behavior: BEHAVIOR_INSTANT,
        userAction: false, blending,
      });
    }
    this.scrollbarShow.set(this.scrollable && this.scrollbarEnabled());
  };

  override ngAfterViewInit() {
    super.ngAfterViewInit();
    this.viewInitialized.set(true);
  }

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
    super.reset(this.startOffset());
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

    if (this.isVertical()) {
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

  startScrollTo() {
    this.stopScrollbar();
    this.stopScrolling();
    this._scrollDirection.clear();
    this.dropVelocity();
    this._isScrollsTo = true;
  }

  finishedScrollTo() {
    this._isScrollsTo = false;
    this.alignPosition(false, true);
    this._scrollDirection.clear();
    this.dropVelocity();
    this.fireScrollEvent(true);
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
    this.stopScrolling();
    const isVertical = this.isVertical(),
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
    this._service.update(false, true);
  }

  onScrollBarDragEndHandler(event: IScrollBarDragEvent) {
    const { position, min, max } = event;
    this._isScrollbarUserAction = false;
    this.dropVelocity();
    this._service.update(false, true);
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

  override ngOnDestroy(): void {
    super.ngOnDestroy();

    this.stopMeasureVelocity();
  }
}