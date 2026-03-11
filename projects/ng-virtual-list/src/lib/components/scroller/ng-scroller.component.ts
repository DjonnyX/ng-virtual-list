import { ChangeDetectionStrategy, Component, Input, OnDestroy, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, from, Subject, takeUntil, tap } from 'rxjs';
import { ScrollBox } from './utils';
import { Id, ScrollBarTheme } from '../../types';
import { NgScrollBarComponent } from "../ng-scroll-bar/ng-scroll-bar.component";
import { GradientColorPositions } from '../../types/gradient-color-positions';
import {
  BEHAVIOR_INSTANT, DEFAULT_SCROLLBAR_ENABLED, DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_SCROLLBAR_MIN_SIZE,
  LEFT_PROP_NAME, SCROLLER_SCROLL, SCROLLER_SCROLLBAR_SCROLL, SCROLLER_WHEEL, TOP_PROP_NAME,
} from '../../const';
import { TextDirection, TextDirections } from '../../enums';
import { NgVirtualListService } from '../../ng-virtual-list.service';
import { IScrollToParams, NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { IScrollBarDragEvent } from '../ng-scroll-bar/interfaces';

const TOP = 'top',
  LEFT = 'left',
  INSTANT = 'instant',
  AUTO = 'auto';

export const SCROLL_EVENT = new Event(SCROLLER_SCROLL),
  WHEEL_EVENT = new Event(SCROLLER_WHEEL),
  SCROLLBAR_SCROLL_EVENT = new Event(SCROLLER_SCROLLBAR_SCROLL);

/**
 * The scroller for the NgVirtualList item component
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/components/scroller/ng-scroller.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroller',
  templateUrl: './ng-scroller.component.html',
  styleUrls: ['./ng-scroller.component.scss'],
  providers: [
    { provide: SCROLL_VIEW_INVERSION, useValue: false },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgScrollerComponent extends NgScrollView implements OnDestroy {
  @ViewChild('scrollBar', { read: NgScrollBarComponent })
  scrollBar: NgScrollBarComponent | undefined;

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

  private _$startOffset = new BehaviorSubject<number>(0);
  readonly $startOffset = this._$startOffset.asObservable();

  @Input()
  set startOffset(v: number) {
    if (this._$startOffset.getValue() !== v) {
      this._$startOffset.next(v);
    }
  }
  get startOffset() { return this._$startOffset.getValue(); }

  private _$endOffset = new BehaviorSubject<number>(0);
  readonly $endOffset = this._$endOffset.asObservable();

  @Input()
  set endOffset(v: number) {
    if (this._$endOffset.getValue() !== v) {
      this._$endOffset.next(v);
    }
  }
  get endOffset() { return this._$endOffset.getValue(); }

  private _$scrollbarTheme = new BehaviorSubject<ScrollBarTheme | undefined>(undefined);
  readonly $scrollbarTheme = this._$scrollbarTheme.asObservable();

  @Input()
  set scrollbarTheme(v: ScrollBarTheme | undefined) {
    if (this._$scrollbarTheme.getValue() !== v) {
      this._$scrollbarTheme.next(v);
    }
  }
  get scrollbarTheme() { return this._$scrollbarTheme.getValue(); }


  private _$scrollbarMinSize = new BehaviorSubject<number>(DEFAULT_SCROLLBAR_MIN_SIZE);
  readonly $scrollbarMinSize = this._$scrollbarMinSize.asObservable();

  @Input()
  set scrollbarMinSize(v: number) {
    if (this._$scrollbarMinSize.getValue() !== v) {
      this._$scrollbarMinSize.next(v);
    }
  }
  get scrollbarMinSize() { return this._$scrollbarMinSize.getValue(); }

  private _$actualClasses = new BehaviorSubject<{ [cName: string]: boolean }>({});
  readonly $actualClasses = this._$actualClasses.asObservable();

  private _$containerClasses = new BehaviorSubject<{ [cName: string]: boolean }>({});
  readonly $containerClasses = this._$containerClasses.asObservable();

  private _$thumbGradientPositions = new BehaviorSubject<GradientColorPositions>([0, 0]);
  readonly $thumbGradientPositions = this._$thumbGradientPositions.asObservable();

  private _$thumbSize = new BehaviorSubject<number>(0);
  readonly $thumbSize = this._$thumbSize.asObservable();

  private _$scrollbarShow = new BehaviorSubject<boolean>(false);
  readonly $scrollbarShow = this._$scrollbarShow.asObservable();

  private _$show = new BehaviorSubject<boolean>(false);
  readonly $show = this._$show.asObservable();

  private _$prepared = new BehaviorSubject<boolean>(false);
  readonly $prepared = this._$prepared.asObservable();

  private _$preparedSignal = new BehaviorSubject<boolean>(false);
  readonly $preparedSignal = this._$preparedSignal.asObservable();

  private _$langTextDir = new BehaviorSubject<TextDirection>(TextDirections.LTR);
  readonly $langTextDir = this._$langTextDir.asObservable();

  private _scrollBox = new ScrollBox();

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

  override set x(v: number) {
    if (v !== undefined && !Number.isNaN(v)) {
      this._x = this._actualX = v;

      this._$updateScrollBar.next();
    }
  }
  override get x() { return this._x; }

  override set y(v: number) {
    if (v !== undefined && !Number.isNaN(v)) {
      this._y = this._actualY = v;

      this._$updateScrollBar.next();
    }
  }
  override get y() { return this._y; }

  protected override _onResizeViewportHandler = () => {
    const viewport = this.scrollViewport?.nativeElement;
    if (viewport) {
      this._$viewportBounds.next({ width: viewport.offsetWidth, height: viewport.offsetHeight });
      this._$updateScrollBar.next();
    }
  }

  protected override _onResizeContentHandler = () => {
    const content = this.scrollContent?.nativeElement;
    if (content) {
      this._$contentBounds.next({ width: content.offsetWidth, height: content.offsetHeight });
      this._$updateScrollBar.next();
    }
  }

  protected _$scrollbarDrag = new Subject<IScrollBarDragEvent>();
  protected $scrollbarDrag = this._$scrollbarDrag.asObservable();

  private _$updateScrollbarWithUpdate = new Subject<boolean>();
  readonly $updateScrollbarWithUpdate = this._$updateScrollbarWithUpdate.asObservable();

  private _isScrollbarUserAction: boolean = false;

  constructor(private _service: NgVirtualListService) {
    super();

    this._service.$langTextDir.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      debounceTime(0),
      tap(v => {
        this._$langTextDir.next(v);
      })
    ).subscribe();

    const $startOffset = this.$startOffset,
      $endOffset = this.$endOffset,
      $scrollbarMinSize = this.$scrollbarMinSize,
      $isVertical = this.$isVertical,
      $thumbSize = this.$thumbSize;

    from([$endOffset, $startOffset, $thumbSize, $scrollbarMinSize, $isVertical]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(() => {
        this._$updateScrollBar.next();
      }),
    ).subscribe();

    combineLatest([this.$startOffset, this.$endOffset]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(() => {
        this._$updateScrollBar.next();
      }),
    ).subscribe();

    const $updateScrollBar = this.$updateScrollBar,
      $updateScrollbarWithUpdate = this._$updateScrollbarWithUpdate;

    $updateScrollBar.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(() => {
        this._$updateScrollbarWithUpdate.next(!this._isScrollbarUserAction);
      }),
    ).subscribe();

    $updateScrollbarWithUpdate.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap(v => {
        this.updateScrollBarHandler(v);
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

    this.$viewInitialized.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      tap((v) => {
        if (v) {
          this._$updateScrollbarWithUpdate.next(false);
        }
      }),
    ).subscribe();

    this.$preparedSignal.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      debounceTime(0),
      tap((v) => {
        this._$prepared.next(v);
      }),
    ).subscribe();

    this.$scrollbarDrag.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      debounceTime(0),
      tap((e) => {
        this.scrollbarDrag(e);
      }),
    ).subscribe();

    combineLatest([this.$scrollbarShow, this.$scrollbarEnabled, this.$preparedSignal]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([scrollbarShow, scrollbarEnabled, preparedSignal]) => {
        this._$show.next(scrollbarShow && scrollbarEnabled && preparedSignal);
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
    if (update) {
      this.scrollBar?.scroll({
        [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: thumbPosition, fireUpdate: false, behavior: BEHAVIOR_INSTANT,
        userAction: false, blending: false,
      });
    }
    this._$scrollbarShow.next(isVertical ? this.scrollHeight > 0 : this.scrollWidth > 0);
  };

  protected override onDragStart() {
    super.onDragStart();

    if (!!this.scrollBar) {
      this.scrollBar.stopScrolling();
    }

    this._isScrollbarUserAction = false;

    this._$updateScrollBar.next();
  }

  override reset() {
    super.reset(this._$startOffset.getValue());
    this.totalSize = 0;
    if (this.scrollBar) {
      this.scrollBar.stopScrolling();
    }
    this.refresh(true, true);
    this.prepared = false;
  }

  refresh(fireUpdate: boolean = false, updateScrollbar: boolean = true) {
    this.scrollLimits();
    if (updateScrollbar) {
      this.stopScrolling();
    }
    if (this._$isVertical.getValue()) {
      this.refreshY(this._y);
    } else {
      this.refreshX(this._x);
    }
    if (updateScrollbar) {
      this._$updateScrollbarWithUpdate.next(true);
      if (this.cdkScrollable) {
        this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLLBAR_SCROLL_EVENT);
      }
    }
    if (fireUpdate) {
      this.fireScrollEvent(false);
    }
  }

  scrollTo(params: IScrollToParams) {
    const userAction = params.userAction ?? true,
      blending = params.blending ?? true,
      fireUpdate = params.fireUpdate ?? false;

    if (userAction && !blending && !fireUpdate) {
      if (this.scrollBar) {
        this.scrollBar.stopScrolling();
      }
      this._isScrollbarUserAction = false;
    }

    this.scroll(params);
  }

  onScrollBarDragHandler(event: IScrollBarDragEvent) {
    this._$scrollbarDrag.next(event);
  }

  scrollbarDrag(event: IScrollBarDragEvent) {
    const { animation, position, min, max, userAction } = event;
    this._isScrollbarUserAction = userAction;
    this.stopScrolling();
    this._isMoving = true;
    const isVertical = this._$isVertical.getValue(),
      {
        position: absolutePosition,
      } = this._scrollBox.getScrollPositionByScrollBar({
        scrollSize: isVertical ? this.scrollHeight : this.scrollWidth,
        position,
      });
    this.scrollTo({
      [isVertical ? TOP : LEFT]: absolutePosition, behavior: animation ? this._$scrollBehavior.getValue() : INSTANT,
      blending: false, userAction, fireUpdate: userAction,
    });
    if (this.cdkScrollable) {
      this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLLBAR_SCROLL_EVENT);
    }
    this._isMoving = false;

    if (userAction && animation && this._service.dynamic) {
      if (position <= min) {
        this._service.scrollToStart();
      } else if (position >= max) {
        this._service.scrollToEnd();
      }
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }
}