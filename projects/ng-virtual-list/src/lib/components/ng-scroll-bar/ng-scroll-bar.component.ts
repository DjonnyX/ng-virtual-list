import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, NO_ERRORS_SCHEMA, output, Signal, signal } from '@angular/core';
import { SubstarateStyle, SubstarateStyles, SubstrateComponent } from '../substrate';
import { GradientColor } from '../../types/gradient-color';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { RoundedCorner } from '../../types/rounded-corner';
import { Subject, tap } from 'rxjs';
import { ScrollBarTheme } from '../../types';
import { Color } from '../../types/color';
import { NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IScrollBarDragEvent } from './interfaces';

const DEFAULT_THICKNESS = 6,
  DEFAULT_SIZE = 6,
  DEFAULT_ROUNDED_CORNER: RoundedCorner = [3, 3, 3, 3],
  DEFAULT_STROKE_ANIMATION_DURATION = 500,
  DEFAULT_RIPPLE_COLOR = 'rgba(0,0,0,0.5)',
  PX = 'px',
  WIDTH = 'width',
  HEIGHT = 'height',
  OPACITY = 'opacity',
  OPACITY_0 = '0',
  OPACITY_1 = '1',
  TRANSITION = 'transition',
  NONE = 'none',
  TOP = 'top',
  LEFT = 'left',
  INSTANT = 'instant',
  TRANSITION_FADE_IN = `${OPACITY} 500ms ease-out`;

/**
 * ScrollBar component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-scroll-bar/ng-scroll-bar.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroll-bar',
  imports: [CommonModule, SubstrateComponent],
  providers: [
    { provide: SCROLL_VIEW_INVERSION, useValue: true },
  ],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './ng-scroll-bar.component.html',
  styleUrl: './ng-scroll-bar.component.scss'
})
export class NgScrollBarComponent extends NgScrollView {
  loading = input<boolean>(false);

  onDrag = output<IScrollBarDragEvent>();

  thumbGradientPositions = input<GradientColorPositions>([0, 0]);

  size = input<number>(DEFAULT_SIZE);

  theme = input<ScrollBarTheme | undefined>(undefined);

  prepared = input<boolean>(false);

  show = input<boolean>(false);

  thickness = signal<number>(DEFAULT_THICKNESS);

  thumbGradientFill = signal<string | GradientColor | undefined>(undefined);

  strokeGradientColor = signal<string | GradientColor | undefined>(undefined);

  strokeAnimationDuration = signal<number>(DEFAULT_STROKE_ANIMATION_DURATION);

  roundCorner = signal<RoundedCorner>(DEFAULT_ROUNDED_CORNER);

  rippleColor = signal<Color | undefined>(DEFAULT_RIPPLE_COLOR);

  type: Signal<SubstarateStyle>;

  styles: Signal<{ [sName: string]: any }>;

  thumbWidth: Signal<number>;

  thumbHeight: Signal<number>;

  private _$scrollingCancel = new Subject<void>();
  readonly $scrollingCancel = this._$scrollingCancel.asObservable();

  constructor() {
    super();

    this.thumbWidth = computed(() => {
      return this.isVertical() ? this.thickness() : this.size();
    });

    this.thumbHeight = computed(() => {
      return this.isVertical() ? this.size() : this.thickness();
    });

    effect(() => {
      this.totalSize = this.size();
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
        const isVertical = this.isVertical(), scrollSize = isVertical ? this.scrollHeight : this.scrollWidth;
        this.onDrag.emit({
          position: scrollSize !== 0 ? ((isVertical ? this._y : this._x) / scrollSize) : 0, animation: !this._isMoving,
          userAction: v,
        });
      }),
    ).subscribe();

    effect(() => {
      const theme = this.theme();
      if (theme) {
        if (theme) {
          this.thumbGradientFill.set(theme.fill);
          this.strokeGradientColor.set(theme.strokeGradientColor);
          this.strokeAnimationDuration.set(theme.strokeAnimationDuration ?? DEFAULT_STROKE_ANIMATION_DURATION);
          this.roundCorner.set(theme.roundCorner ?? DEFAULT_ROUNDED_CORNER);
          this.thickness.set(theme.thickness ?? DEFAULT_THICKNESS);
          this.rippleColor.set(theme.rippleColor ?? DEFAULT_RIPPLE_COLOR);
        }
      }
    });
  }
}
