import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { SubstarateStyle, SubstarateStyles, SubstrateComponent } from '../substrate';
import { GradientColor } from '../../types/gradient-color';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { RoundedCorner } from '../../types/rounded-corner';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, fromEvent, Subject, takeUntil, tap } from 'rxjs';
import { ScrollBarTheme } from '../../types';
import { Color } from '../../types/color';
import { NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { IScrollBarDragEvent } from './interfaces';
import { DEFAULT_SCROLLBAR_INTERACTIVE, DEFAULT_SCROLLBAR_THEME } from '../../const';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const DEFAULT_THICKNESS = 6,
  DEFAULT_SIZE = 6,
  DEFAULT_ROUNDED_CORNER: RoundedCorner = [3, 3, 3, 3],
  DEFAULT_STROKE_ANIMATION_DURATION = 500,
  DEFAULT_RIPPLE_ENABLED = true,
  DEFAULT_RIPPLE_COLOR = 'rgba(0,0,0,0.5)',
  PX = 'px',
  WIDTH = 'width',
  HEIGHT = 'height',
  OPACITY = 'opacity',
  OPACITY_0 = '0',
  OPACITY_1 = '1',
  TRANSITION = 'transition',
  NONE = 'none',
  TRANSITION_FADE_IN = `${OPACITY} 500ms ease-out`;

/**
 * ScrollBar component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/components/ng-scroll-bar/ng-scroll-bar.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroll-bar',
  templateUrl: './ng-scroll-bar.component.html',
  styleUrls: ['./ng-scroll-bar.component.scss'],
  providers: [
    { provide: SCROLL_VIEW_INVERSION, useValue: true },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgScrollBarComponent extends NgScrollView {
  @ViewChild('substrate', { read: SubstrateComponent })
  substrate: SubstrateComponent | undefined;
  private _$loading = new BehaviorSubject<boolean>(false);
  readonly $loading = this._$loading.asObservable();

  @Input()
  set loading(v: boolean) {
    this._$loading.next(v);
  }
  get loading() { return this._$loading.getValue(); }

  @Output()
  onDrag = new EventEmitter<IScrollBarDragEvent>();

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

  private _$fill = new BehaviorSubject<string | GradientColor | undefined>(undefined);
  readonly $fill = this._$fill.asObservable();

  private _$thumbGradientFill = new BehaviorSubject<string | GradientColor | undefined>(undefined);
  readonly $thumbGradientFill = this._$thumbGradientFill.asObservable();

  private _$thumbHoverGradientFill = new BehaviorSubject<string | GradientColor | undefined>(undefined);
  readonly $thumbHoverGradientFill = this._$thumbHoverGradientFill.asObservable();

  private _$thumbPressedGradientFill = new BehaviorSubject<string | GradientColor | undefined>(undefined);
  readonly $thumbPressedGradientFill = this._$thumbPressedGradientFill.asObservable();

  private _$strokeGradientColor = new BehaviorSubject<string | GradientColor | undefined>(undefined);
  readonly $strokeGradientColor = this._$strokeGradientColor.asObservable();

  private _$strokeAnimationDuration = new BehaviorSubject<number>(DEFAULT_STROKE_ANIMATION_DURATION);
  readonly $strokeAnimationDuration = this._$strokeAnimationDuration.asObservable();

  private _$roundCorner = new BehaviorSubject<RoundedCorner>(DEFAULT_ROUNDED_CORNER);
  readonly $roundCorner = this._$roundCorner.asObservable();

  private _$rippleColor = new BehaviorSubject<Color | undefined>(DEFAULT_RIPPLE_COLOR);
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

  constructor(private _elementRef: ElementRef) {
    super();

    this.$size.pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      tap(v => {
        this.totalSize = v;
      }),
    ).subscribe();

    this.$interactive.pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      tap(v => {
        this.interactive = v;
      }),
    ).subscribe();

    this.$loading.pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      tap(v => {
        this._$type.next(v ? SubstarateStyles.STROKE : SubstarateStyles.NONE);
      }),
    ).subscribe();

    this.$theme.pipe(
      takeUntilDestroyed(this._destroyRef),
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

    const $grabbing = this.$grabbing;

    $grabbing.pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      tap(v => {
        this._$classes.next({ grabbing: v });
      }),
    ).subscribe();

    combineLatest([this.$isVertical, this.$thickness, this.$size]).pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      tap(([isVertical, thickness, size]) => {
        this._$thumbWidth.next(isVertical ? thickness : size);
        this._$thumbHeight.next(isVertical ? size : thickness);
      }),
    ).subscribe();
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
    const $isVertical = this.$isVertical.pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
    ), $thickness = this.$thickness.pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
    ), $size = this.$size.pipe(
      distinctUntilChanged(),
      takeUntilDestroyed(this._destroyRef),
    );

    const $pointerDown = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerdown').pipe(
      takeUntilDestroyed(this._destroyRef),
    ), $pointerUp = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerup').pipe(
      takeUntilDestroyed(this._destroyRef),
    ), $docPointerUp = fromEvent<PointerEvent>(document, 'pointerup').pipe(
      takeUntilDestroyed(this._destroyRef)
    ), $pointerEnter = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerenter').pipe(
      takeUntilDestroyed(this._destroyRef),
    ), $pointerLeave = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerleave').pipe(
      takeUntilDestroyed(this._destroyRef),
    );

    $pointerDown.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(e => {
        this._$pressedState.next(this.thumbHit(e.clientX, e.clientY));
      }),
    ).subscribe();

    combineLatest([$docPointerUp, $pointerUp]).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(() => {
        this._$pressedState.next(false);
      }),
    ).subscribe();

    $pointerEnter.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(() => {
        this._$hoverState.next(true);
      }),
    ).subscribe();

    $pointerLeave.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(() => {
        this._$hoverState.next(false);
      }),
    ).subscribe();

    const $pressedState = this.$pressedState.pipe(
      takeUntilDestroyed(this._destroyRef),
    ), $hoverState = this.$hoverState.pipe(
      takeUntilDestroyed(this._destroyRef),
    ), $thumbPressedGradientFill = this.$thumbPressedGradientFill.pipe(
      takeUntilDestroyed(this._destroyRef),
    ), $thumbHoverGradientFill = this.$thumbHoverGradientFill.pipe(
      takeUntilDestroyed(this._destroyRef),
    ), $thumbGradientFill = this.$thumbGradientFill.pipe(
      takeUntilDestroyed(this._destroyRef),
    );

    combineLatest([
      $pressedState, $hoverState, $thumbPressedGradientFill, $thumbHoverGradientFill, $thumbGradientFill,
    ]).pipe(
      takeUntilDestroyed(this._destroyRef),
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

    combineLatest([this.$show, $isVertical, $thickness]).pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      tap(([show, isVertical, thickness]) => {
        this._$styles.next({
          [isVertical ? WIDTH : HEIGHT]: `${thickness}${PX}`,
          [OPACITY]: show ? OPACITY_1 : OPACITY_0, [TRANSITION]: show ? TRANSITION_FADE_IN : NONE,
        });
      }),
    ).subscribe();
    this.$scroll.pipe(
      takeUntilDestroyed(this._destroyRef),
      debounceTime(0),
      tap(v => {
        const isVertical = this._$isVertical.getValue(), scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
          scrollContent = this.scrollContent?.nativeElement as HTMLElement,
          scrollViewport = this.scrollViewport?.nativeElement as HTMLDivElement;
        if (!!scrollViewport && !!scrollContent) {
          const contentSize = isVertical ? scrollContent.offsetHeight : scrollContent.offsetWidth,
            viewportSize = isVertical ? scrollViewport.offsetHeight : scrollViewport.offsetWidth;
          this.onDrag.emit({
            position: scrollSize !== 0 ? ((isVertical ? this._y : this._x) / scrollSize) : 0,
            min: scrollSize !== 0 ? (this._$startOffset.getValue() / scrollSize) : 0,
            max: scrollSize !== 0 ? ((viewportSize - this._$endOffset.getValue() - contentSize) / scrollSize) : 0,
            animation: !this._isMoving,
            userAction: v,
          });
        }
      }),
    ).subscribe();

    const content = this.scrollContent!.nativeElement;

    fromEvent<PointerEvent>(content, 'pointerdown').pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(e => {
        if (!!this.substrate) {
          this.ripple(this.substrate, e);
        }
      }),
    ).subscribe();
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

  protected override normalizeAnimatedValue(value: number) {
    const isVertical = this._$isVertical.getValue(), scrollContent = this.scrollContent?.nativeElement as HTMLElement,
      scrollViewport = this.scrollViewport?.nativeElement as HTMLDivElement;
    if (!!scrollContent && !!scrollViewport) {
      const startOffset = this._$startOffset.getValue(), endOffset = this._$endOffset.getValue();
      if (isVertical) {
        const maxY = scrollViewport.offsetHeight - endOffset - scrollContent.offsetHeight;
        return value < startOffset ? startOffset : value > maxY ? maxY : value;
      } else {
        const maxX = scrollViewport.offsetWidth - endOffset - scrollContent.offsetWidth;
        return value < startOffset ? startOffset : value > maxX ? maxX : value;
      }
    }
    return value;
  }

  ripple(substrate: SubstrateComponent, event: PointerEvent | MouseEvent) {
    if (this._$rippleEnabled.getValue() && !!substrate) {
      substrate.ripple(event);
    }
  }
}
