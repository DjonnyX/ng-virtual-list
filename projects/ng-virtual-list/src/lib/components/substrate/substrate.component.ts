import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject, combineLatest, delay, filter, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Color } from '../../types/color';
import { GradientColor } from '../../types/gradient-color';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { RoundedCorner } from '../../types/rounded-corner';
import { SubstarateMode } from './types/substrate-mode';
import { SubstarateModes } from './enums/substrate-modes';
import { SubstarateStyle } from './types';
import { SubstarateStyles } from './enums';
import { getShapeMinSize } from '../../utils/get-shape-min-size';
import { circlePath, roundedRectPath } from './utils';
import {
  CLIP_NAME, CLIP_PATH, CX, CY, D, DEFAULT_FILL_COLORS, DEFAULT_RIPPLE_COLOR, DEFAULT_STROKE_ANIMATION_DURATION,
  DEFAULT_STROKE_WIDTH, DUR, FILL, FILL_GRADIENT_NAME, GRADIENT_COLOR_NAME, HREF, ID, MS, NONE, PX, R, RIPPLE_ANIMATE_CLASS,
  SHAPE_NAME, STROKE, STROKE_GRADIENT_NAME, STROKE_WIDTH, VIEW_BOX, X1, X2,
} from './const';

/**
 * Substrate
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/16.x/projects/ng-virtual-list/src/lib/components/substrate/substrate.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'substrate',
  templateUrl: './substrate.component.html',
  styleUrls: ['./substrate.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
})
export class SubstrateComponent {
  private static __id: number = 0;
  private static get nextId() {
    const id = SubstrateComponent.__id = SubstrateComponent.__id + 1 === Number.MAX_SAFE_INTEGER ? 0 : SubstrateComponent.__id + 1;
    return id;
  }

  private _id: number;

  get id() { return this._id; }

  @ViewChild('svg')
  svg: ElementRef<SVGElement> | undefined;

  @ViewChild('ripple')
  rippleShape: ElementRef<SVGCircleElement> | undefined;

  @ViewChild('clip')
  clip: ElementRef<SVGClipPathElement> | undefined;

  @ViewChild('clipUse')
  clipUse: ElementRef<SVGUseElement> | undefined;

  @ViewChild('shape')
  shape: ElementRef<SVGUseElement> | undefined;

  @ViewChild('hilight')
  hilight: ElementRef<SVGUseElement> | undefined;

  @ViewChild('path')
  path: ElementRef<SVGPathElement> | undefined;

  @ViewChild('fillGradient')
  fillGradient: ElementRef<SVGPathElement> | undefined;

  @ViewChild('strokeGradient')
  strokeGradient: ElementRef<SVGPathElement> | undefined;

  @ViewChild('fillGradientColor1')
  fillGradientColor1: ElementRef<SVGStopElement> | undefined;

  @ViewChild('fillGradientColor2')
  fillGradientColor2: ElementRef<SVGStopElement> | undefined;

  @ViewChild('strokeGradientColor1')
  strokeGradientColor1: ElementRef<SVGStopElement> | undefined;

  @ViewChild('strokeGradientColor2')
  strokeGradientColor2: ElementRef<SVGStopElement> | undefined;

  @ViewChild('strokeAnimation')
  strokeAnimation: ElementRef<SVGAnimateTransformElement> | undefined;

  private _$mode = new BehaviorSubject<SubstarateMode>(SubstarateModes.ROUNDED_RECTANGLE);
  readonly $mode = this._$mode.asObservable();

  @Input()
  set mode(v: SubstarateMode) {
    this._$mode.next(v);
  }
  get mode() { return this._$mode.getValue(); }

  private _$width = new BehaviorSubject<number>(0);
  readonly $width = this._$width.asObservable();

  @Input()
  set width(v: number) {
    this._$width.next(v);
  }
  get width() { return this._$width.getValue(); }

  private _$height = new BehaviorSubject<number>(0);
  readonly $height = this._$height.asObservable();

  @Input()
  set height(v: number) {
    this._$height.next(v);
  }
  get height() { return this._$height.getValue(); }

  private _$roundCorner = new BehaviorSubject<RoundedCorner | undefined>(undefined);
  readonly $roundCorner = this._$roundCorner.asObservable();

  @Input()
  set roundCorner(v: RoundedCorner | undefined) {
    this._$roundCorner.next(v);
  }
  get roundCorner() { return this._$roundCorner.getValue(); }

  private _$type = new BehaviorSubject<SubstarateStyle>(SubstarateStyles.NONE);
  readonly $type = this._$type.asObservable();

  @Input()
  set type(v: SubstarateStyle) {
    this._$type.next(v);
  }
  get type() { return this._$type.getValue(); }

  private _$strokeColors = new BehaviorSubject<string | GradientColor | undefined>(undefined);
  readonly $strokeColors = this._$strokeColors.asObservable();

  @Input()
  set strokeColors(v: string | GradientColor | undefined) {
    this._$strokeColors.next(v);
  }
  get strokeColors() { return this._$strokeColors.getValue(); }

  private _$strokeWidth = new BehaviorSubject<number>(DEFAULT_STROKE_WIDTH);
  readonly $strokeWidth = this._$strokeWidth.asObservable();

  @Input()
  set strokeWidth(v: number) {
    this._$strokeWidth.next(v);
  }
  get strokeWidth() { return this._$strokeWidth.getValue(); }

  private _$strokeAnimationDuration = new BehaviorSubject<number>(DEFAULT_STROKE_ANIMATION_DURATION);
  readonly $strokeAnimationDuration = this._$strokeAnimationDuration.asObservable();

  @Input()
  set strokeAnimationDuration(v: number) {
    this._$strokeAnimationDuration.next(v);
  }
  get strokeAnimationDuration() { return this._$strokeAnimationDuration.getValue(); }

  private _$rippleColor = new BehaviorSubject<Color | undefined>(DEFAULT_RIPPLE_COLOR);
  readonly $rippleColor = this._$rippleColor.asObservable();

  @Input()
  set rippleColor(v: Color | undefined) {
    this._$rippleColor.next(v);
  }
  get rippleColor() { return this._$rippleColor.getValue(); }

  private _$fillColors = new BehaviorSubject<string | GradientColor | undefined>(DEFAULT_FILL_COLORS);
  readonly $fillColors = this._$fillColors.asObservable();

  @Input()
  set fillColors(v: string | GradientColor | undefined) {
    this._$fillColors.next(v);
  }
  get fillColors() { return this._$fillColors.getValue(); }

  private _$fillPositions = new BehaviorSubject<GradientColorPositions | undefined>(undefined);
  readonly $fillPositions = this._$fillPositions.asObservable();

  @Input()
  set fillPositions(v: GradientColorPositions | undefined) {
    this._$fillPositions.next(v);
  }
  get fillPositions() { return this._$fillPositions.getValue(); }

  private _$rippleEnabled = new BehaviorSubject<boolean>(false);
  readonly $rippleEnabled = this._$rippleEnabled.asObservable();

  @Input()
  set rippleEnabled(v: boolean) {
    this._$rippleEnabled.next(v);
  }
  get rippleEnabled() { return this._$rippleEnabled.getValue(); }

  protected _destroyRef = inject(DestroyRef);

  constructor(private _elementRef: ElementRef<HTMLDivElement>) {
    this._id = SubstrateComponent.nextId;
  }

  ngAfterViewInit(): void {
    const fillGradient = this.fillGradient;
    if (fillGradient) {
      fillGradient.nativeElement.setAttribute(ID, `${FILL_GRADIENT_NAME}${this._id}`);
    }

    const strokeGradient = this.strokeGradient;
    if (strokeGradient) {
      strokeGradient.nativeElement.setAttribute(ID, `${STROKE_GRADIENT_NAME}${this._id}`);
    }

    const path = this.path;
    if (path) {
      path.nativeElement.setAttribute(ID, `${SHAPE_NAME}${this._id}`);
    }

    const clip = this.clip;
    if (clip) {
      clip.nativeElement.setAttribute(ID, `${CLIP_NAME}${this._id}`);
    }

    const clipUse = this.clipUse;
    if (clipUse) {
      clipUse.nativeElement.setAttribute(HREF, `#${SHAPE_NAME}${this._id}`);
    }

    const shape = this.shape;
    if (shape) {
      shape.nativeElement.setAttribute(CLIP_PATH, `url(#${CLIP_NAME}${this._id})`);
      shape.nativeElement.setAttribute(HREF, `#${SHAPE_NAME}${this._id}`);
    }

    const hilight = this.hilight;
    if (hilight) {
      hilight.nativeElement.setAttribute(CLIP_PATH, `url(#${CLIP_NAME}${this._id})`);
      hilight.nativeElement.setAttribute(HREF, `#${SHAPE_NAME}${this._id}`);
    }

    const rippleShape = this.rippleShape;
    if (rippleShape) {
      rippleShape.nativeElement.setAttribute(CLIP_PATH, `url(#${CLIP_NAME}${this._id})`);
    }

    this.$fillColors.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(fillColors => {
        const color1: Color = Array.isArray(fillColors) && fillColors.length > 0 ?
          fillColors[0] : typeof fillColors === 'string' ? fillColors as Color : DEFAULT_FILL_COLORS[0];
        const color2: Color = Array.isArray(fillColors) && fillColors.length > 1 ?
          fillColors[1] : typeof fillColors === 'string' ? fillColors as Color : DEFAULT_FILL_COLORS[1];
        const fillGradientColor1 = this.fillGradientColor1, fillGradientColor2 = this.fillGradientColor2;
        if (fillGradientColor1 && fillGradientColor2) {
          fillGradientColor1.nativeElement.setAttribute(GRADIENT_COLOR_NAME, `${color1}`);
          fillGradientColor2.nativeElement.setAttribute(GRADIENT_COLOR_NAME, `${color2}`);

          const shape = this.shape?.nativeElement;
          if (shape) {
            shape.setAttribute(FILL, `url(#${FILL_GRADIENT_NAME}${this._id})`);
          }
        }
      }),
    ).subscribe();

    this.$strokeWidth.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(strokeWidth => {
        const shape = this.shape?.nativeElement, path = this.path?.nativeElement, hilight = this.hilight?.nativeElement;
        if (shape) {
          shape.setAttribute(STROKE_WIDTH, `${strokeWidth}`);
        }
        if (path) {
          path.setAttribute(STROKE_WIDTH, `${strokeWidth * 2}`);
        }
        if (hilight) {
          hilight.setAttribute(STROKE_WIDTH, `${strokeWidth * 2}`);
        }
      }),
    ).subscribe();

    this.$strokeAnimationDuration.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(strokeAnimationDuration => {
        const strokeAnimation = this.strokeAnimation?.nativeElement;
        if (strokeAnimation) {
          strokeAnimation.setAttribute(DUR, `${strokeAnimationDuration ?? DEFAULT_STROKE_ANIMATION_DURATION}${MS}`);
        }
      }),
    ).subscribe();

    this.$fillPositions.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(fillPositions => {
        if (Array.isArray(fillPositions) && fillPositions.length === 2) {
          const fillGradient = this.fillGradient;
          if (fillGradient) {
            fillGradient.nativeElement.setAttribute(X1, `${fillPositions[0]}${PX}`);
            fillGradient.nativeElement.setAttribute(X2, `${fillPositions[1]}${PX}`);
          }
        }
      }),
    ).subscribe();

    this.$strokeColors.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(strokeColors => {
        if (Array.isArray(strokeColors) && strokeColors.length === 2) {
          const strokeGradientColor1 = this.strokeGradientColor1, strokeGradientColor2 = this.strokeGradientColor2;
          if (strokeGradientColor1 && strokeGradientColor2) {
            strokeGradientColor1.nativeElement.setAttribute(GRADIENT_COLOR_NAME, `${strokeColors[0]}`);
            strokeGradientColor2.nativeElement.setAttribute(GRADIENT_COLOR_NAME, `${strokeColors[1]}`);
          }
        }
      }),
    ).subscribe();

    combineLatest(([this.$width, this.$height, this.$roundCorner, this.$mode])).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(([width, height, roundCorner, mode]) => {
        const svg = this.svg?.nativeElement, path = this.path?.nativeElement, minSize = getShapeMinSize(roundCorner),
          ww = (width || minSize), w = ww >= minSize ? ww : minSize,
          hh = (height || minSize), h = hh >= minSize ? hh : minSize;
        if (svg && path) {
          svg.style.width = `${w}${PX}`;
          svg.style.height = `${h}${PX}`;
          svg.setAttribute(VIEW_BOX, `0 0 ${w} ${h}`);
          switch (mode) {
            case SubstarateModes.CIRCLE: {
              const r = Math.min(w, h) * .5, shape = circlePath(w * .5, h * .5, r);
              path.setAttribute('d', shape);
              break;
            }
            case SubstarateModes.ROUNDED_RECTANGLE: {
              const corner = Array.isArray(roundCorner) && roundCorner.length === 4 ? roundCorner : [0, 0, 0, 0];
              const shape = roundedRectPath(w, h, corner[0], corner[1], corner[2], corner[3]);
              path.setAttribute(D, shape);
              break;
            }
            case SubstarateModes.RECTANGLE:
            default: {
              const shape = roundedRectPath(w, h, 0, 0, 0, 0);
              path.setAttribute(D, shape);
              break;
            }
          }
        }
      }),
    ).subscribe();

    this.$type.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(type => {
        const shape = this.shape?.nativeElement, hilight = this.hilight?.nativeElement;
        if (shape) {
          switch (type) {
            case SubstarateStyles.STROKE: {
              shape.setAttribute(STROKE, `url(#${STROKE_GRADIENT_NAME}${this._id})`);
              break;
            }
            case SubstarateStyles.NONE:
            default:
              shape.setAttribute(STROKE, NONE);
              break;
          }
        }
        if (hilight) {
          switch (type) {
            case SubstarateStyles.STROKE: {
              hilight.setAttribute(STROKE, `url(#${STROKE_GRADIENT_NAME}${this._id})`);
              break;
            }
            case SubstarateStyles.NONE:
            default:
              hilight.setAttribute(STROKE, NONE);
              break;
          }
        }
      }),
    ).subscribe();

    const $rippleEnabled = this.$rippleEnabled;

    $rippleEnabled.pipe(
      takeUntilDestroyed(this._destroyRef),
      filter(v => !!v),
      tap(() => {
        if (rippleShape) {
          rippleShape.nativeElement.classList.add(RIPPLE_ANIMATE_CLASS);
        }
      }),
      delay(800),
      takeUntilDestroyed(this._destroyRef),
      tap(() => {
        if (rippleShape) {
          rippleShape.nativeElement.classList.remove(RIPPLE_ANIMATE_CLASS);
          this._$rippleEnabled.next(false);
        }
      }),
    ).subscribe();
  }

  ripple(e: PointerEvent | MouseEvent) {
    const { x, y, width, height } = (this._elementRef.nativeElement as HTMLDivElement).getBoundingClientRect(),
      localX = e.clientX - x, localY = e.clientY - y, rippleColor = this._$rippleColor.getValue() ?? DEFAULT_RIPPLE_COLOR, endRadius = Math.max(width, height);
    const rippleShape = this.rippleShape?.nativeElement;
    if (rippleShape) {
      rippleShape.setAttribute(CX, String(localX));
      rippleShape.setAttribute(CY, String(localY));
      rippleShape.setAttribute(R, String(endRadius));
      rippleShape.setAttribute(FILL, rippleColor);
    }
    this._$rippleEnabled.next(true);
  }
}
