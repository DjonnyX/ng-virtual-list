import { Component, computed, effect, inject, input, NO_ERRORS_SCHEMA, OnDestroy, Signal, signal, ViewChild } from '@angular/core';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, tap } from 'rxjs';
import { ScrollBox } from './utils';
import { Id, ScrollBarTheme } from '../../types';
import { NgScrollBarComponent } from "../ng-scroll-bar/ng-scroll-bar.component";
import { GradientColorPositions } from '../../types/gradient-color-positions';
import {
  DEFAULT_SCROLLBAR_MIN_SIZE, SCROLLER_SCROLL, SCROLLER_SCROLLBAR_SCROLL, SCROLLER_WHEEL,
} from '../../const';
import { LocaleSensitiveDirective } from '../../directives';
import { TextDirection, TextDirections } from '../../enums';
import { NgVirtualListService } from '../../ng-virtual-list.service';
import { CommonModule } from '@angular/common';
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
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/scroller/ng-scroller.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroller',
  imports: [CommonModule, CdkScrollable, LocaleSensitiveDirective, NgScrollBarComponent],
  providers: [
    { provide: SCROLL_VIEW_INVERSION, useValue: false },
  ],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './ng-scroller.component.html',
  styleUrl: './ng-scroller.component.scss'
})
export class NgScrollerComponent extends NgScrollView implements OnDestroy {
  @ViewChild('scrollBar', { read: NgScrollBarComponent })
  scrollBar: NgScrollBarComponent | undefined;

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

  thumbGradientPositions = signal<GradientColorPositions>([0, 0]);

  thumbSize = signal<number>(0);

  thumbPosition = signal<number>(0);

  scrollbarShow = signal<boolean>(false);

  preparedSignal = signal<boolean>(false);

  private _service = inject(NgVirtualListService);

  langTextDir = signal<TextDirection>(TextDirections.LTR);

  private _scrollBox = new ScrollBox();

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

  override set x(v: number) {
    if (v !== undefined && !Number.isNaN(v)) {
      this._x = this._actualX = v;

      this.updateScrollBar();
    }
  }
  override get x() { return this._x; }

  override set y(v: number) {
    if (v !== undefined && !Number.isNaN(v)) {
      this._y = this._actualY = v;

      this.updateScrollBar();
    }
  }
  override get y() { return this._y; }

  protected override _onResizeViewportHandler = () => {
    const viewport = this.scrollViewport()?.nativeElement;
    if (viewport) {
      this.viewportBounds.set({ width: viewport.offsetWidth, height: viewport.offsetHeight });
      this.updateScrollBar();
    }
  }

  protected override _onResizeContentHandler = () => {
    const content = this.scrollContent()?.nativeElement;
    if (content) {
      this.contentBounds.set({ width: content.offsetWidth, height: content.offsetHeight });
      this.updateScrollBar();
    }
  }

  readonly viewInitialized = signal<boolean>(false);

  private _scrollbarAnimation = false;

  constructor() {
    super();

    this._service.$langTextDir.pipe(
      tap(v => {
        this.langTextDir.set(v);
      })
    ).subscribe();

    const $updateScrollBar = this.$updateScrollBar;

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
      if (!this._scrollbarAnimation) {
        this.thumbPosition.set(thumbPosition);
      }
      this.scrollbarShow.set(isVertical ? this.scrollHeight > 0 : this.scrollWidth > 0);
    };

    $updateScrollBar.pipe(
      takeUntilDestroyed(this._destroyRef),
      debounceTime(0),
      tap(() => {
        updateScrollBarHandler();
      }),
    ).subscribe();

    this.actualClasses = computed(() => {
      const classes = this.classes(), direction = this.direction();
      return { ...classes, [direction]: true, grabbing: this.grabbing() };
    });

    this.containerClasses = computed(() => {
      return { [this.direction()]: true, grabbing: this.grabbing() };
    });

    effect(() => {
      const viewInitialized = this.viewInitialized();
      if (viewInitialized) {
        updateScrollBarHandler();
      }
    });
  }

  ngAfterViewInit() {
    this.viewInitialized.set(true);
  }

  private updateScrollBar() {
    this._$updateScrollBar.next();
  }

  protected override onDragStart() {
    super.onDragStart();

    this._scrollbarAnimation = false;

    if (!!this.scrollBar) {
      this.scrollBar.stopScrolling();
    }
  }

  override reset() {
    super.reset();
    if (this.scrollBar) {
      this.scrollBar.stopScrolling();
    }
    this.move(this.isVertical(), 0);
  }

  scrollTo(params: IScrollToParams) {
    const userAction = params.userAction ?? true,
    blending = params.blending ?? true,
    fireUpdate = params.fireUpdate ?? false;

    if (userAction && !blending && !fireUpdate) {
      this._scrollbarAnimation = false;
      if (this.scrollBar) {
        this.scrollBar.stopScrolling();
      }
    }

    this.scroll(params);
  }

  onScrollBarDragHandler({ animation, position, userAction }: IScrollBarDragEvent) {
    this._scrollbarAnimation = animation;
    this.stopScrolling();
    this._isMoving = true;
    const isVertical = this.isVertical(),
      {
        position: absolutePosition,
      } = this._scrollBox.getScrollPositionByScrollBar({
        scrollSize: isVertical ? this.actualScrollHeight : this.actualScrollWidth,
        position,
      });
    this.scrollTo({
      [isVertical ? TOP : LEFT]: absolutePosition, behavior: animation ? AUTO : INSTANT,
      blending: false, userAction, fireUpdate: true,
    });
    if (this.cdkScrollable) {
      this.cdkScrollable.getElementRef().nativeElement.dispatchEvent(SCROLLBAR_SCROLL_EVENT);
    }
    this._isMoving = false;
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }
}