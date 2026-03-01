import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { SubstarateStyle, SubstarateStyles } from '../substrate';
import { GradientColor } from '../../types/gradient-color';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { RoundedCorner } from '../../types/rounded-corner';
import { BehaviorSubject, combineLatest, filter, fromEvent, map, of, race, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { DEFAULT_SCROLLBAR_THEME, MOUSE_DOWN, MOUSE_MOVE, MOUSE_UP, TOUCH_END, TOUCH_MOVE, TOUCH_START } from '../../const';
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
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/components/ng-scroll-bar/ng-scroll-bar.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-scroll-bar',
  templateUrl: './ng-scroll-bar.component.html',
  styleUrls: ['./ng-scroll-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgScrollBarComponent implements OnDestroy {
  protected _$unsubscribe = new Subject<void>();

  @ViewChild('thumb')
  thumb: ElementRef<HTMLDivElement> | undefined;

  @ViewChild('track')
  track: ElementRef<HTMLDivElement> | undefined;

  private _$viewInitialized = new BehaviorSubject<boolean>(false);
  readonly $viewInitialized = this._$viewInitialized.asObservable();

  private _$loading = new BehaviorSubject<boolean>(false);
  readonly $loading = this._$loading.asObservable();

  @Input()
  set loading(v: boolean) {
    this._$loading.next(v);
  }
  get loading() { return this._$loading.getValue(); }

  private _$isVertical = new BehaviorSubject<boolean>(true);
  readonly $isVertical = this._$isVertical.asObservable();

  @Input()
  set isVertical(v: boolean) {
    this._$isVertical.next(v);
  }
  get isVertical() { return this._$isVertical.getValue(); }

  private _$position = new BehaviorSubject<number>(0);
  readonly $position = this._$position.asObservable();

  @Input()
  set position(v: number) {
    this._$position.next(v);
  }
  get position() { return this._$position.getValue(); }

  private _$thumbGradientPositions = new BehaviorSubject<GradientColorPositions>([0, 0]);
  readonly $thumbGradientPositions = this._$thumbGradientPositions.asObservable();

  @Input()
  set thumbGradientPositions(v: GradientColorPositions) {
    this._$thumbGradientPositions.next(v);
  }
  get thumbGradientPositions() { return this._$thumbGradientPositions.getValue(); }

  private _$size = new BehaviorSubject<number>(DEFAULT_SIZE);
  readonly $size = this._$size.asObservable();

  @Input()
  set size(v: number) {
    this._$size.next(v);
  }
  get size() { return this._$size.getValue(); }

  private _$theme = new BehaviorSubject<ScrollBarTheme | undefined>(DEFAULT_SCROLLBAR_THEME);
  readonly $theme = this._$theme.asObservable();

  @Input()
  set theme(v: ScrollBarTheme | undefined) {
    this._$theme.next(v);
  }
  get theme() { return this._$theme.getValue(); }

  private _$prepared = new BehaviorSubject<boolean>(false);
  readonly $prepared = this._$prepared.asObservable();

  @Input()
  set prepared(v: boolean) {
    this._$prepared.next(v);
  }
  get prepared() { return this._$prepared.getValue(); }

  private _$show = new BehaviorSubject<boolean>(false);
  readonly $show = this._$show.asObservable();

  @Input()
  set show(v: boolean) {
    this._$show.next(v);
  }
  get show() { return this._$show.getValue(); }

  @Output()
  onDrag = new EventEmitter<number>();

  private _$actualPosition = new BehaviorSubject<number>(0);
  readonly $actualPosition = this._$actualPosition.asObservable();

  private _$thickness = new BehaviorSubject<number>(DEFAULT_THICKNESS);
  readonly $thickness = this._$thickness.asObservable();

  private _$thumbGradientFill = new BehaviorSubject<string | GradientColor | undefined>(undefined);
  readonly $thumbGradientFill = this._$thumbGradientFill.asObservable();

  private _$strokeGradientColor = new BehaviorSubject<string | GradientColor | undefined>(undefined);
  readonly $strokeGradientColor = this._$strokeGradientColor.asObservable();

  private _$strokeAnimationDuration = new BehaviorSubject<number>(DEFAULT_STROKE_ANIMATION_DURATION);
  readonly $strokeAnimationDuration = this._$strokeAnimationDuration.asObservable();

  private _$roundCorner = new BehaviorSubject<RoundedCorner>(DEFAULT_ROUNDED_CORNER);
  readonly $roundCorner = this._$roundCorner.asObservable();

  private _$rippleColor = new BehaviorSubject<Color | undefined>(DEFAULT_RIPPLE_COLOR);
  readonly $rippleColor = this._$rippleColor.asObservable();

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

  private _resizeObserver: ResizeObserver;

  private _$bounds = new BehaviorSubject<ISize>({ width: 0, height: 0 });
  readonly $bounds = this._$bounds.asObservable();

  private _onResizeHandler = () => {
    const content = this.track?.nativeElement;
    if (content) {
      this._$bounds.next({ width: content.offsetWidth, height: content.offsetHeight });
    }
  }

  private _$grabbing = new BehaviorSubject<boolean>(false);
  readonly $grabbing = this._$grabbing.asObservable();

  get scrollSize() {
    const bounds = this._$bounds.getValue(), size = this._$size.getValue(), isVertical = this._$isVertical.getValue();
    return isVertical ? size < bounds.height ? bounds.height - size : 0 : size < bounds.width ? bounds.width - size : 0;
  }

  private _$scrollingCancel = new Subject<void>();
  readonly $scrollingCancel = this._$scrollingCancel.asObservable();

  constructor() {
    this._resizeObserver = new ResizeObserver(this._onResizeHandler);

    const $track = this.$viewInitialized.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      switchMap(() => of(this.track).pipe(
        filter(v => !!v),
        map(v => v!.nativeElement),
      )),
    ),
      $thumb = this.$viewInitialized.pipe(
        takeUntil(this._$unsubscribe),
        filter(v => !!v),
        switchMap(() => of(this.thumb).pipe(
          filter(v => !!v),
          map(v => v!.nativeElement),
        )),
      );

    $track.pipe(
      takeUntil(this._$unsubscribe),
      tap(track => {
        this._resizeObserver.observe(track);
        this._onResizeHandler();
      }),
    ).subscribe();

    combineLatest([this.$isVertical, this.$thickness, this.$size]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([isVertical, thickness, size]) => {
        this._$thumbWidth.next(isVertical ? thickness : size);
        this._$thumbHeight.next(isVertical ? size : thickness);
      }),
    ).subscribe();

    this.$loading.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._$type.next(v ? SubstarateStyles.STROKE : SubstarateStyles.NONE);
      }),
    ).subscribe();

    combineLatest([this.$isVertical, this.$show, this.$thickness]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([isVertical, show, thickness]) => {
        this._$styles.next({
          [isVertical ? WIDTH : HEIGHT]: `${thickness}${PX}`,
          [OPACITY]: show ? OPACITY_1 : OPACITY_0, [TRANSITION]: show ? TRANSITION_FADE_IN : NONE,
        })
      }),
    ).subscribe();

    this.$position.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._$actualPosition.next(v);
      }),
    ).subscribe();

    combineLatest([this.$isVertical, this.$actualPosition]).pipe(
      takeUntil(this._$unsubscribe),
      tap(([isVertical, position]) => {
        const thumb = this.thumb?.nativeElement;
        if (thumb) {
          if (isVertical) {
            thumb.style.transform = `${TRANSLATE_3D}(0, ${position}${PX}, 0)`;
          } else {
            thumb.style.transform = `${TRANSLATE_3D}(${position}${PX}, 0, 0)`;
          }
        }
      }),
    ).subscribe();

    this.$theme.pipe(
      takeUntil(this._$unsubscribe),
      filter(v => !!v),
      tap(theme => {
        if (!!theme) {
          this._$thumbGradientFill.next(theme.fill);
          this._$strokeGradientColor.next(theme.strokeGradientColor);
          this._$strokeAnimationDuration.next(theme.strokeAnimationDuration ?? DEFAULT_STROKE_ANIMATION_DURATION);
          this._$roundCorner.next(theme.roundCorner ?? DEFAULT_ROUNDED_CORNER);
          this._$thickness.next(theme.thickness ?? DEFAULT_THICKNESS);
          this._$rippleColor.next(theme.rippleColor ?? DEFAULT_RIPPLE_COLOR);
        }
      }),
    ).subscribe();

    const $grabbing = this.$grabbing;

    $grabbing.pipe(
      takeUntil(this._$unsubscribe),
      tap(v => {
        this._$classes.next({ grabbing: v });
      }),
    ).subscribe();

    const $mouseUp = fromEvent<MouseEvent>(window, MOUSE_UP, { passive: false }).pipe(
      takeUntil(this._$unsubscribe),
    ),
      $mouseDragCancel = race([
        $mouseUp.pipe(
          takeUntil(this._$unsubscribe),
          tap(() => {
            this._$grabbing.next(false);
          }),
        ), this.$scrollingCancel
      ]);

    $thumb.pipe(
      takeUntil(this._$unsubscribe),
      switchMap(thumb => {
        return fromEvent<MouseEvent>(thumb, MOUSE_DOWN, { passive: false }).pipe(
          takeUntil(this._$unsubscribe),
          switchMap(e => {
            const isVertical = this._$isVertical.getValue();
            this._$grabbing.next(true);
            const startPos = this._$position.getValue();
            const startClientPos = isVertical ? e.clientY : e.clientX;
            return fromEvent<MouseEvent>(window, MOUSE_MOVE, { passive: false }).pipe(
              takeUntil(this._$unsubscribe),
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
                  takeUntil(this._$unsubscribe),
                  takeUntil($mouseDragCancel),
                  tap(e => {
                    if (e) {
                      e.preventDefault();
                    }
                    this.scrollTo(position);
                    this._$grabbing.next(false);
                  }),
                );
              }),
            );
          })
        );
      }),
    ).subscribe();

    const $touchUp = fromEvent<TouchEvent>(window, TOUCH_END, { passive: false }).pipe(
      takeUntil(this._$unsubscribe),
    ),
      $touchCanceler = race([
        $touchUp.pipe(
          takeUntil(this._$unsubscribe),
          tap(() => {
            this._$grabbing.next(false);
          }),
        ), this.$scrollingCancel,
      ]);

    $thumb.pipe(
      takeUntil(this._$unsubscribe),
      switchMap(thumb => {
        return fromEvent<TouchEvent>(thumb, TOUCH_START, { passive: false }).pipe(
          takeUntil(this._$unsubscribe),
          switchMap(e => {
            const isVertical = this._$isVertical.getValue();
            this._$grabbing.next(true);
            const startPos = this._$position.getValue();
            const startClientPos = isVertical ? e.touches[e.touches.length - 1].clientY : e.touches[e.touches.length - 1].clientX;
            return fromEvent<TouchEvent>(window, TOUCH_MOVE, { passive: false }).pipe(
              takeUntil(this._$unsubscribe),
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
                  takeUntil(this._$unsubscribe),
                  takeUntil(this.$scrollingCancel),
                  tap(e => {
                    if (e) {
                      e.preventDefault();
                    }
                    this.scrollTo(position);
                    this._$grabbing.next(false);
                  }),
                );
              }),
            );
          })
        );
      }),
    ).subscribe();
  }

  ngAfterViewInit(): void {
    this.afterViewInit();
  }

  private afterViewInit() {
    this._$viewInitialized.next(true);
  }

  scrollTo(position: number) {
    const scrollSize = this.scrollSize;
    this.onDrag.emit(scrollSize !== 0 ? position / scrollSize : 0);
  }

  stopScrolling() {
    this._$scrollingCancel.next();
  }

  ngOnDestroy(): void {
    if (this._$unsubscribe) {
      this._$unsubscribe.next();
      this._$unsubscribe.complete();
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }
}
