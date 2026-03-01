import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, effect, ElementRef, inject, input, OnDestroy, output, Signal, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SubstarateStyle, SubstarateStyles, SubstrateComponent } from '../substrate';
import { GradientColor } from '../../types/gradient-color';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { RoundedCorner } from '../../types/rounded-corner';
import { filter, fromEvent, map, race, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { MOUSE_DOWN, MOUSE_MOVE, MOUSE_UP, TOUCH_END, TOUCH_MOVE, TOUCH_START } from '../../const';
import { ISize, ScrollBarTheme } from '../../types';
import { Color } from '../../types/color';

const DEFAULT_THICKNESS = 6,
  DEFAULT_SIZE = 6,
  DEFAULT_ROUNDED_CORNER: RoundedCorner = [3, 3, 3, 3],
  DEFAULT_STROKE_ANIMATION_DURATION = 500,
  DEFAULT_RIPPLE_COLOR = 'rgba(0,0,0,0.5)',
  TRANSLATE_3D = 'translate3d',
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
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/components/ng-scroll-bar/ng-scroll-bar.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroll-bar',
  imports: [CommonModule, SubstrateComponent],
  templateUrl: './ng-scroll-bar.component.html',
  styleUrl: './ng-scroll-bar.component.scss'
})
export class NgScrollBarComponent implements OnDestroy {
  thumb = viewChild<ElementRef<HTMLDivElement>>('thumb');

  track = viewChild<ElementRef<HTMLDivElement>>('track');

  loading = input<boolean>(false);

  isVertical = input<boolean>(true);

  position = input<number>(0);

  actualPosition = signal<number>(0);

  onDrag = output<number>();

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

  private _destroyRef = inject(DestroyRef);

  private _resizeObserver: ResizeObserver;

  readonly bounds = signal<ISize>({ width: 0, height: 0 });

  private _onResizeHandler = () => {
    const content = this.track()?.nativeElement;
    if (content) {
      this.bounds.set({ width: content.offsetWidth, height: content.offsetHeight });
    }
  }

  grabbing = signal<boolean>(false);

  get scrollSize() {
    const bounds = this.bounds(), size = this.size(), isVertical = this.isVertical();
    return isVertical ? size < bounds.height ? bounds.height - size : 0 : size < bounds.width ? bounds.width - size : 0;
  }

  private _$scrollingCancel = new Subject<void>();
  readonly $scrollingCancel = this._$scrollingCancel.asObservable();

  constructor() {
    this._resizeObserver = new ResizeObserver(this._onResizeHandler);

    const $track = toObservable(this.track).pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      map(v => v.nativeElement),
    );

    $track.pipe(
      takeUntilDestroyed(),
      tap(track => {
        this._resizeObserver.observe(track);
        this._onResizeHandler();
      }),
    ).subscribe();

    this.thumbWidth = computed(() => {
      return this.isVertical() ? this.thickness() : this.size();
    });

    this.thumbHeight = computed(() => {
      return this.isVertical() ? this.size() : this.thickness();
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

    effect(() => {
      const position = this.position();
      this.actualPosition.set(position);
    });

    effect(() => {
      const position = this.actualPosition(), isVertical = this.isVertical(), thumb = this.thumb()?.nativeElement;
      if (thumb) {
        if (isVertical) {
          thumb.style.transform = `${TRANSLATE_3D}(0, ${position}${PX}, 0)`;
        } else {
          thumb.style.transform = `${TRANSLATE_3D}(${position}${PX}, 0, 0)`;
        }
      }
    });

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

    const $thumb = toObservable(this.thumb).pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      map(v => v.nativeElement),
    );

    const $mouseUp = fromEvent<MouseEvent>(window, MOUSE_UP, { passive: false }).pipe(
      takeUntilDestroyed(),
    ),
      $mouseDragCancel = race([
        $mouseUp.pipe(
          takeUntilDestroyed(),
          tap(() => {
            this.grabbing.set(false);
          }),
        ), this.$scrollingCancel
      ]);

    $thumb.pipe(
      takeUntilDestroyed(),
      switchMap(thumb => {
        return fromEvent<MouseEvent>(thumb, MOUSE_DOWN, { passive: false }).pipe(
          takeUntilDestroyed(this._destroyRef),
          switchMap(e => {
            const isVertical = this.isVertical();
            this.grabbing.set(true);
            const startPos = this.position();
            const startClientPos = isVertical ? e.clientY : e.clientX;
            return fromEvent<MouseEvent>(window, MOUSE_MOVE, { passive: false }).pipe(
              takeUntilDestroyed(this._destroyRef),
              takeUntil($mouseDragCancel),
              tap(e => {
                e.preventDefault();
              }),
              switchMap(e => {
                const currentPos = isVertical ? e.clientY : e.clientX,
                  scrollSize = this.scrollSize, delta = startClientPos - currentPos,
                  dp = startPos - delta, position = Math.round(dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp);
                this.scrollTo(position);
                return race([this.$scrollingCancel, fromEvent<MouseEvent>(window, MOUSE_UP, { passive: false }), fromEvent<MouseEvent>(thumb, MOUSE_UP, { passive: false })]).pipe(
                  takeUntilDestroyed(this._destroyRef),
                  takeUntil($mouseDragCancel),
                  tap(e => {
                    if (e) {
                      e.preventDefault();
                    }
                    this.scrollTo(position);
                    this.grabbing.set(false);
                  }),
                );
              }),
            );
          })
        );
      }),
    ).subscribe();

    const $touchUp = fromEvent<TouchEvent>(window, TOUCH_END, { passive: false }).pipe(
      takeUntilDestroyed(),
    ),
      $touchCanceler = race([
        $touchUp.pipe(
          takeUntilDestroyed(this._destroyRef),
          tap(() => {
            this.grabbing.set(false);
          }),
        ), this.$scrollingCancel,
      ]);

    $thumb.pipe(
      takeUntilDestroyed(),
      switchMap(thumb => {
        return fromEvent<TouchEvent>(thumb, TOUCH_START, { passive: false }).pipe(
          takeUntilDestroyed(this._destroyRef),
          switchMap(e => {
            const isVertical = this.isVertical();
            this.grabbing.set(true);
            const startPos = this.position();
            const startClientPos = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX;
            return fromEvent<TouchEvent>(window, TOUCH_MOVE, { passive: false }).pipe(
              takeUntilDestroyed(this._destroyRef),
              takeUntil($touchCanceler),
              tap(e => {
                e.preventDefault();
              }),
              switchMap(e => {
                const currentPos = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX,
                  scrollSize = this.scrollSize, delta = startClientPos - currentPos,
                  dp = startPos - delta, position = Math.round(dp < 0 ? 0 : dp > scrollSize ? scrollSize : dp);
                this.scrollTo(position);
                return race([this.$scrollingCancel, fromEvent<TouchEvent>(window, TOUCH_END, { passive: false }), fromEvent<TouchEvent>(thumb, TOUCH_END, { passive: false })]).pipe(
                  takeUntilDestroyed(this._destroyRef),
                  takeUntil(this.$scrollingCancel),
                  tap(e => {
                    if (e) {
                      e.preventDefault();
                    }
                    this.scrollTo(position);
                    this.grabbing.set(false);
                  }),
                );
              }),
            );
          })
        );
      }),
    ).subscribe();
  }

  scrollTo(position: number) {
    const scrollSize = this.scrollSize;
    this.onDrag.emit(scrollSize !== 0 ? position / scrollSize : 0);
  }

  stopScrolling() {
    this._$scrollingCancel.next();
  }

  ngOnDestroy(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }
}
