import { Component, computed, effect, ElementRef, inject, input, output, Signal, signal } from '@angular/core';
import { SubstarateStyle, SubstarateStyles, SubstrateComponent } from '../substrate';
import { GradientColor } from '../../types/gradient-color';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { RoundedCorner } from '../../types/rounded-corner';
import { combineLatest, fromEvent, Subject, tap } from 'rxjs';
import { ScrollBarTheme } from '../../types';
import { Color } from '../../types/color';
import { NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IScrollBarDragEvent } from './interfaces';
import { DEFAULT_SCROLLBAR_INTERACTIVE } from '../../const';

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
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/components/ng-scroll-bar/ng-scroll-bar.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroll-bar',
  providers: [
    { provide: SCROLL_VIEW_INVERSION, useValue: true },
  ],
  standalone: false,
  templateUrl: './ng-scroll-bar.component.html',
  styleUrl: './ng-scroll-bar.component.scss'
})
export class NgScrollBarComponent extends NgScrollView {
  loading = input<boolean>(false);

  onDrag = output<IScrollBarDragEvent>();

  thumbGradientPositions = input<GradientColorPositions>([0, 0]);

  size = input<number>(DEFAULT_SIZE);

  theme = input<ScrollBarTheme | undefined>(undefined);

  startOffset = input<number>(0);

  endOffset = input<number>(0);

  scrollbarMinSize = input<number>(0);

  prepared = input<boolean>(false);

  interactive = input<boolean>(DEFAULT_SCROLLBAR_INTERACTIVE);

  show = input<boolean>(false);

  thickness = signal<number>(DEFAULT_THICKNESS);

  fill: Signal<string | GradientColor | undefined>;

  thumbGradientFill = signal<string | GradientColor | undefined>(undefined);

  thumbHoverGradientFill = signal<string | GradientColor | undefined>(undefined);

  thumbPressedGradientFill = signal<string | GradientColor | undefined>(undefined);

  strokeGradientColor = signal<string | GradientColor | undefined>(undefined);

  strokeAnimationDuration = signal<number>(DEFAULT_STROKE_ANIMATION_DURATION);

  roundCorner = signal<RoundedCorner>(DEFAULT_ROUNDED_CORNER);

  rippleColor = signal<Color | undefined>(DEFAULT_RIPPLE_COLOR);

  rippleEnabled = signal<boolean>(DEFAULT_RIPPLE_ENABLED);

  hoverState = signal<boolean>(false);

  pressedState = signal<boolean>(false);

  type: Signal<SubstarateStyle>;

  styles: Signal<{ [sName: string]: any }>;

  thumbWidth: Signal<number>;

  thumbHeight: Signal<number>;

  private _$scrollingCancel = new Subject<void>();
  readonly $scrollingCancel = this._$scrollingCancel.asObservable();

  private _elementRef = inject(ElementRef);

  constructor() {
    super();

    this.thumbWidth = computed(() => {
      return this.isVertical() ? this.thickness() : this.size();
    });

    this.thumbHeight = computed(() => {
      return this.isVertical() ? this.size() : this.thickness();
    });

    const $pointerDown = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerdown').pipe(
      takeUntilDestroyed(),
    ), $pointerUp = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerup').pipe(
      takeUntilDestroyed(),
    ), $docPointerUp = fromEvent<PointerEvent>(document, 'pointerup').pipe(
      takeUntilDestroyed()
    ), $pointerEnter = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerenter').pipe(
      takeUntilDestroyed(),
    ), $pointerLeave = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerleave').pipe(
      takeUntilDestroyed(),
    );

    $pointerDown.pipe(
      takeUntilDestroyed(),
      tap(e => {
        this.pressedState.set(this.thumbHit(e.clientX, e.clientY));
      }),
    ).subscribe();

    combineLatest([$docPointerUp, $pointerUp]).pipe(
      takeUntilDestroyed(),
      tap(() => {
        this.pressedState.set(false);
      }),
    ).subscribe();

    $pointerEnter.pipe(
      takeUntilDestroyed(),
      tap(() => {
        this.hoverState.set(true);
      }),
    ).subscribe();

    $pointerLeave.pipe(
      takeUntilDestroyed(),
      tap(() => {
        this.hoverState.set(false);
      }),
    ).subscribe();

    this.fill = computed(() => {
      const pressed = this.pressedState(), hover = this.hoverState();
      if (pressed) {
        return this.thumbPressedGradientFill();
      } else if (hover) {
        return this.thumbHoverGradientFill();
      }
      return this.thumbGradientFill();
    });

    effect(() => {
      this.totalSize = this.size();
    });

    effect(() => {
      this._interactive = this.interactive();
    });

    this.type = computed(() => {
      return this.loading() ? SubstarateStyles.STROKE : SubstarateStyles.NONE;
    });

    this.styles = computed(() => {
      const show = this.show();
      return {
        [this.isVertical() ? WIDTH : HEIGHT]: `${this.thickness()}${PX}`,
        [OPACITY]: show ? OPACITY_1 : OPACITY_0, [TRANSITION]: show ? TRANSITION_FADE_IN : NONE,
      };
    });

    this.$scroll.pipe(
      takeUntilDestroyed(),
      tap(v => {
        const isVertical = this.isVertical(), scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
          scrollContent = this.scrollContent()?.nativeElement as HTMLElement,
          scrollViewport = this.scrollViewport()?.nativeElement as HTMLDivElement;
        if (!!scrollViewport && !!scrollContent) {
          const contentSize = isVertical ? scrollContent.offsetHeight : scrollContent.offsetWidth,
            viewportSize = isVertical ? scrollViewport.offsetHeight : scrollViewport.offsetWidth;
          this.onDrag.emit({
            position: scrollSize !== 0 ? ((isVertical ? this._y : this._x) / scrollSize) : 0,
            min: scrollSize !== 0 ? (this.startOffset() / scrollSize) : 0,
            max: scrollSize !== 0 ? ((viewportSize - this.endOffset() - contentSize) / scrollSize) : 0,
            animation: !this._isMoving,
            userAction: v,
          });
        }
      }),
    ).subscribe();

    effect(() => {
      const theme = this.theme();
      if (theme) {
        if (theme) {
          this.thumbGradientFill.set(theme.fill);
          this.thumbHoverGradientFill.set(theme.hoverFill);
          this.thumbPressedGradientFill.set(theme.pressedFill);
          this.strokeGradientColor.set(theme.strokeGradientColor);
          this.strokeAnimationDuration.set(theme.strokeAnimationDuration ?? DEFAULT_STROKE_ANIMATION_DURATION);
          this.roundCorner.set(theme.roundCorner ?? DEFAULT_ROUNDED_CORNER);
          this.thickness.set(theme.thickness ?? DEFAULT_THICKNESS);
          this.rippleColor.set(theme.rippleColor ?? DEFAULT_RIPPLE_COLOR);
          this.rippleEnabled.set(theme.rippleEnabled ?? DEFAULT_RIPPLE_ENABLED)
        }
      }
    });
  }

  private thumbHit(x: number, y: number): boolean {
    const thumb = this.scrollContent()?.nativeElement;
    if (!!thumb) {
      const { x: tX, y: tY, width: tWidth, height: tHeight } = thumb.getBoundingClientRect()
      if ((x >= tX && x <= tX + tWidth) && (y >= tY && y <= tY + tHeight)) {
        return true;
      }
    }
    return false;
  }

  protected override normalizeAnimatedValue(value: number) {
    const isVertical = this.isVertical(), scrollContent = this.scrollContent()?.nativeElement as HTMLElement,
      scrollViewport = this.scrollViewport()?.nativeElement as HTMLDivElement;
    if (!!scrollContent && !!scrollViewport) {
      const startOffset = this.startOffset(), endOffset = this.endOffset();
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
    if (this.rippleEnabled() && !!substrate) {
      substrate.ripple(event);
    }
  }
}
