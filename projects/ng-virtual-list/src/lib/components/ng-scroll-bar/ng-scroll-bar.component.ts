import { Component, ElementRef, EventEmitter, inject, Input, Output } from '@angular/core';
import { SubstarateStyle, SubstarateStyles, SubstrateComponent } from '../substrate';
import { GradientColor } from '../../types/gradient-color';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { RoundedCorner } from '../../types/rounded-corner';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, fromEvent, Subject, takeUntil, tap } from 'rxjs';
import { ScrollBarTheme } from '../../types';
import { Color } from '../../types/color';
import { NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { IScrollBarDragEvent } from './interfaces';
import { DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_SCROLLBAR_THEME } from '../../const';
import {
  DEFAULT_RIPPLE_COLOR, DEFAULT_RIPPLE_ENABLED, DEFAULT_ROUNDED_CORNER, DEFAULT_SIZE, DEFAULT_STROKE_ANIMATION_DURATION,
  DEFAULT_THICKNESS, HEIGHT, NONE, OPACITY, OPACITY_0, OPACITY_1, PX, TRANSITION, TRANSITION_FADE_IN, WIDTH,
} from './const';
import { SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO } from '../ng-scroll-view/const';

/**
 * ScrollBar component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/components/ng-scroll-bar/ng-scroll-bar.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroll-bar',
  providers: [
    { provide: SCROLL_VIEW_INVERSION, useValue: true },
    { provide: SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, useValue: false },
  ],
  templateUrl: './ng-scroll-bar.component.html',
  styleUrls: ['./ng-scroll-bar.component.scss']
})
export class NgScrollBarComponent extends NgScrollView {
  private _$loading = new BehaviorSubject<boolean>(false);
  readonly $loading = this._$loading.asObservable();

  @Input()
  set loading(v: boolean) {
    this._$loading.next(v);
  }
  get loading() { return this._$loading.getValue(); }

  @Output()
  onDrag = new EventEmitter<IScrollBarDragEvent>();

  @Output()
  onDragEnd = new EventEmitter<IScrollBarDragEvent>();

  private _$thumbGradientPositions = new BehaviorSubject<GradientColorPositions>([0, 0]);
  readonly $thumbGradientPositions = this._$thumbGradientPositions.asObservable();

  @Input()
  set thumbGradientPositions(v: GradientColorPositions) {
    if (this._$thumbGradientPositions.getValue() !== v) {
      this._$thumbGradientPositions.next(v);
    }
  }
  get thumbGradientPositions() { return this._$thumbGradientPositions.getValue(); }

  private _$size = new BehaviorSubject<number>(DEFAULT_SIZE);
  readonly $size = this._$size.asObservable();

  @Input()
  set size(v: number) {
    if (this._$size.getValue() !== v) {
      this._$size.next(v);
    }
  }
  get size() { return this._$size.getValue(); }

  private _$theme = new BehaviorSubject<ScrollBarTheme | undefined>(DEFAULT_SCROLLBAR_THEME);
  readonly $theme = this._$theme.asObservable();

  @Input()
  set theme(v: ScrollBarTheme | undefined) {
    if (this._$theme.getValue() !== v) {
      this._$theme.next(v);
    }
  }
  get theme() { return this._$theme.getValue(); }


  private _$scrollbarMinSize = new BehaviorSubject<number>(0);
  readonly $scrollbarMinSize = this._$scrollbarMinSize.asObservable();

  @Input()
  set scrollbarMinSize(v: number) {
    if (this._$scrollbarMinSize.getValue() !== v) {
      this._$scrollbarMinSize.next(v);
    }
  }
  get scrollbarMinSize() { return this._$endOffset.getValue(); }

  private _$prepared = new BehaviorSubject<boolean>(false);
  readonly $prepared = this._$prepared.asObservable();

  @Input()
  set prepared(v: boolean) {
    if (this._$prepared.getValue() !== v) {
      this._$prepared.next(v);
    }
  }
  get prepared() { return this._$prepared.getValue(); }

  private _$interactive = new BehaviorSubject<boolean>(DEFAULT_SCROLLBAR_INTERACTIVE);
  readonly $interactive = this._$interactive.asObservable();

  @Input()
  set interactive(v: boolean) {
    if (this._$interactive.getValue() !== v) {
      this._$interactive.next(v);
    }
  }
  get interactive() { return this._$interactive.getValue(); }

  private _$show = new BehaviorSubject<boolean>(false);
  readonly $show = this._$show.asObservable();

  @Input()
  set show(v: boolean) {
    if (this._$show.getValue() !== v) {
      this._$show.next(v);
    }
  }
  get show() { return this._$show.getValue(); }

  private _$thickness = new BehaviorSubject<number>(DEFAULT_THICKNESS);
  readonly $thickness = this._$thickness.asObservable();

  private _$fill = new BehaviorSubject<Color | GradientColor | null>(null);
  readonly $fill = this._$fill.asObservable();

  private _$thumbGradientFill = new BehaviorSubject<Color | GradientColor | null>(null);
  readonly $thumbGradientFill = this._$thumbGradientFill.asObservable();

  private _$thumbHoverGradientFill = new BehaviorSubject<Color | GradientColor | null>(null);
  readonly $thumbHoverGradientFill = this._$thumbHoverGradientFill.asObservable();

  private _$thumbPressedGradientFill = new BehaviorSubject<Color | GradientColor | null>(null);
  readonly $thumbPressedGradientFill = this._$thumbPressedGradientFill.asObservable();

  private _$strokeGradientColor = new BehaviorSubject<Color | GradientColor | null>(null);
  readonly $strokeGradientColor = this._$strokeGradientColor.asObservable();

  private _$strokeAnimationDuration = new BehaviorSubject<number>(DEFAULT_STROKE_ANIMATION_DURATION);
  readonly $strokeAnimationDuration = this._$strokeAnimationDuration.asObservable();

  private _$roundCorner = new BehaviorSubject<RoundedCorner>(DEFAULT_ROUNDED_CORNER);
  readonly $roundCorner = this._$roundCorner.asObservable();

  private _$rippleColor = new BehaviorSubject<Color | null>(DEFAULT_RIPPLE_COLOR);
  readonly $rippleColor = this._$rippleColor.asObservable();

  private _$rippleEnabled = new BehaviorSubject<boolean>(DEFAULT_RIPPLE_ENABLED);
  readonly $rippleEnabled = this._$rippleEnabled.asObservable();

  private _$hoverState = new BehaviorSubject<boolean>(false);
  readonly $hoverState = this._$hoverState.asObservable();

  private _$pressedState = new BehaviorSubject<boolean>(false);
  readonly $pressedState = this._$pressedState.asObservable();

  private _$classes = new BehaviorSubject<{ [className: string]: boolean }>({});
  readonly $classes = this._$classes.asObservable();

  private _$type = new BehaviorSubject<SubstarateStyle>(SubstarateStyles.STROKE);
  readonly $type = this._$type.asObservable();

  private _$styles = new BehaviorSubject<{ [styleName: string]: any }>({});
  readonly $styles = this._$styles.asObservable();

  private _$thumbWidth = new BehaviorSubject<number>(0);
  readonly $thumbWidth = this._$thumbWidth.asObservable();

  private _$thumbHeight = new BehaviorSubject<number>(0);
  readonly $thumbHeight = this._$thumbHeight.asObservable();

  private _$scrollingCancel = new Subject<void>();
  readonly $scrollingCancel = this._$scrollingCancel.asObservable();

  private _elementRef = inject(ElementRef);

  constructor() {
    super();

    const $prepared = this.$prepared;
    $prepared.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(() => {
        this.scrollLimits();
        this.refreshX(this._x);
        this.refreshY(this._y);
        this.fireScrollEvent(false);
      }),
    ).subscribe();


    combineLatest([this.$isVertical, this.$thickness, this.$size]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(([isVertical, thickness, size]) => {
        this._$thumbWidth.next(isVertical ? thickness : size);
        this._$thumbHeight.next(isVertical ? size : thickness);
      }),
    ).subscribe();
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    const $pointerDown = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerdown').pipe(
      takeUntil(this._$unsubscribe),
    ), $pointerUp = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerup').pipe(
      takeUntil(this._$unsubscribe),
    ), $docPointerUp = fromEvent<PointerEvent>(document, 'pointerup').pipe(
      takeUntil(this._$unsubscribe)
    ), $pointerEnter = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerenter').pipe(
      takeUntil(this._$unsubscribe),
    ), $pointerLeave = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerleave').pipe(
      takeUntil(this._$unsubscribe),
    );

    $pointerDown.pipe(
      takeUntil(this._$unsubscribe),
      tap(e => {
        this._$pressedState.next(this.thumbHit(e.clientX, e.clientY));
      }),
    ).subscribe();

    combineLatest([$docPointerUp, $pointerUp]).pipe(
      takeUntil(this._$unsubscribe),
      tap(() => {
        this._$pressedState.next(false);
      }),
    ).subscribe();

    $pointerEnter.pipe(
      takeUntil(this._$unsubscribe),
      tap(() => {
        this._$hoverState.next(true);
      }),
    ).subscribe();

    $pointerLeave.pipe(
      takeUntil(this._$unsubscribe),
      tap(() => {
        this._$hoverState.next(false);
      }),
    ).subscribe();

    const $pressedState = this.$pressedState.pipe(
      takeUntil(this._$unsubscribe),
    ), $hoverState = this.$hoverState.pipe(
      takeUntil(this._$unsubscribe),
    ), $thumbPressedGradientFill = this.$thumbPressedGradientFill.pipe(
      takeUntil(this._$unsubscribe),
    ), $thumbHoverGradientFill = this.$thumbHoverGradientFill.pipe(
      takeUntil(this._$unsubscribe),
    ), $thumbGradientFill = this.$thumbGradientFill.pipe(
      takeUntil(this._$unsubscribe),
    );

    combineLatest([
      $pressedState, $hoverState, $thumbPressedGradientFill, $thumbHoverGradientFill, $thumbGradientFill,
    ]).pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      distinctUntilChanged(),
      tap(([pressedState, hoverState, thumbPressedGradientFill, thumbHoverGradientFill, thumbGradientFill]) => {
        if (pressedState) {
          this._$fill.next(thumbPressedGradientFill);
        } else if (hoverState) {
          this._$fill.next(thumbHoverGradientFill);
        } else {
          this._$fill.next(thumbGradientFill);
        }
      }),
    ).subscribe();

    this.$size.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this.totalSize = v;
      }),
    ).subscribe();

    this.$interactive.pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(v => {
        this.interactive = v;
      }),
    ).subscribe();

    this.$loading.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      distinctUntilChanged(),
      tap(v => {
        this._$type.next(v ? SubstarateStyles.STROKE : SubstarateStyles.NONE);
      }),
    ).subscribe();

    combineLatest([this.$show, this.$isVertical, this.$thickness]).pipe(
      takeUntil(this._$unsubscribe),
      distinctUntilChanged(),
      tap(([show, isVertical, thickness]) => {
        this._$styles.next({
          [isVertical ? WIDTH : HEIGHT]: `${thickness}${PX}`,
          [OPACITY]: show ? OPACITY_1 : OPACITY_0, [TRANSITION]: show ? TRANSITION_FADE_IN : NONE,
        });
      }),
    ).subscribe();

    this.$scroll.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        const event = this.createDragEvent(v);
        if (!!event) {
          this.onDrag.emit(event);
        }
      }),
    ).subscribe();

    const $scrollEnd = this.$scrollEnd;
    $scrollEnd.pipe(
      takeUntil(this._$unsubscribe),
      tap(() => {
        const event = this.createDragEvent(false);
        if (!!event) {
          this.onDragEnd.emit(event);
        }
      }),
    ).subscribe();

    this.$theme.pipe(
      takeUntil(this._$unsubscribe),
      debounceTime(0),
      distinctUntilChanged(),
      tap(theme => {
        if (!!theme) {
          this._$thumbGradientFill.next(theme.fill);
          this._$thumbHoverGradientFill.next(theme.hoverFill);
          this._$thumbPressedGradientFill.next(theme.pressedFill);
          this._$strokeGradientColor.next(theme.strokeGradientColor);
          this._$strokeAnimationDuration.next(theme.strokeAnimationDuration ?? DEFAULT_STROKE_ANIMATION_DURATION);
          this._$roundCorner.next(theme.roundCorner ?? DEFAULT_ROUNDED_CORNER);
          this._$thickness.next(theme.thickness ?? DEFAULT_THICKNESS);
          this._$rippleColor.next(theme.rippleColor ?? DEFAULT_RIPPLE_COLOR);
          this._$rippleEnabled.next(theme.rippleEnabled ?? DEFAULT_RIPPLE_ENABLED)
        }
      }),
    ).subscribe();
  }

  private createDragEvent(userAction: boolean) {
    const isVertical = this._$isVertical.getValue(), scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
      scrollContent = this.scrollContent?.nativeElement as HTMLElement,
      scrollViewport = this.scrollViewport?.nativeElement as HTMLDivElement;
    if (!!scrollViewport && !!scrollContent) {
      const contentSize = isVertical ? scrollContent.offsetHeight : scrollContent.offsetWidth,
        viewportSize = isVertical ? scrollViewport.offsetHeight : scrollViewport.offsetWidth;
      const event: IScrollBarDragEvent = {
        position: scrollSize !== 0 ? ((isVertical ? this._y : this._x) / scrollSize) : 0,
        min: scrollSize !== 0 ? (this._$startOffset.getValue() / scrollSize) : 0,
        max: scrollSize !== 0 ? ((viewportSize - this._$endOffset.getValue() - contentSize) / scrollSize) : 0,
        animation: !this._isMoving,
        userAction,
      };
      return event;
    }
    return null;
  }

  private thumbHit(x: number, y: number): boolean {
    const thumb = this.scrollContent?.nativeElement;
    if (!!thumb) {
      const { x: tX, y: tY, width: tWidth, height: tHeight } = thumb.getBoundingClientRect()
      if ((x >= tX && x <= tX + tWidth) && (y >= tY && y <= tY + tHeight)) {
        return true;
      }
    }
    return false;
  }

  ripple(substrate: SubstrateComponent, event: PointerEvent | MouseEvent) {
    if (this._$rippleEnabled.getValue() && !!substrate) {
      substrate.ripple(event);
    }
  }
}
