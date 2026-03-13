import { Component, DestroyRef, effect, ElementRef, inject, input, signal, viewChild, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { delay, filter, map, switchMap, tap } from 'rxjs';
import { Color } from '../../types/color';
import { GradientColor } from '../../types/gradient-color';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { RoundedCorner } from '../../types/rounded-corner';
import { SubstarateMode } from './types/substrate-mode';
import { SubstarateModes } from './enums/substrate-modes';
import { SubstarateStyle } from './types';
import { SubstarateStyles } from './enums';
import { getShapeMinSize } from '../../utils/get-shape-min-size';

const DEFAULT_STROKE_ANIMATION_DURATION = 1000,
  DEFAULT_FILL_COLORS: GradientColor = ["rgba(0, 0, 0, .1)", "rgba(0, 0, 0, .1)"],
  DEFAULT_STROKE_WIDTH = 3,
  RIPPLE_ANIMATE_CLASS = 'animate',
  DEFAULT_RIPPLE_COLOR = 'rgba(0, 0, 0, .1)',
  SHAPE_NAME = 'ng-substrate-shape',
  CLIP_NAME = 'ng-substrate-clip',
  GRADIENT_COLOR_NAME = 'stop-color',
  FILL_GRADIENT_NAME = 'ng-substrate-fill-gradient',
  STROKE_GRADIENT_NAME = 'ng-substrate-stroke-gradient',
  FILL = 'fill',
  INHERIT = 'inherit',
  STROKE_WIDTH = 'stroke-width',
  DUR = 'dur',
  X1 = 'x1',
  X2 = 'x2',
  ID = 'id',
  HREF = 'href',
  CLIP_PATH = 'clip-path',
  PX = 'px',
  MS = 'ms',
  D = 'd',
  VIEW_BOX = 'viewBox',
  CX = 'cx',
  CY = 'cy',
  R = 'r',
  STROKE = 'stroke',
  NONE = 'none';

const circlePath = (cx: number, cy: number, r: number) => {
  // return 'M ' + cx + ' ' + cy + ' m -' + r + ', 0 a ' + r + ',' + r + ' 0 1,1 ' + (r * 2) + ',0 a ' + r + ',' + r + ' 0 1,1 -' + (r * 2) + ',0';
  return `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,1 ${(r * 2)},0 a ${r},${r} 0 1,1 -${(r * 2)},0`;
};

const roundedRectPath = (width: number, height: number, tl: number, tr: number, br: number, bl: number) => {
  const top = width - tl - tr;
  const right = height - tr - br;
  const bottom = width - br - bl;
  const left = height - bl - tl;
  const d = `
        M${tl},0
        h${top}
        a${tr},${tr} 0 0 1 ${tr},${tr}
        v${right}
        a${br},${br} 0 0 1 -${br},${br}
        h-${bottom}
        a${bl},${bl} 0 0 1 -${bl},-${bl}
        v-${left}
        a${tl},${tl} 0 0 1 ${tl},-${tl}
        z
    `;
  return d;
};

/**
 * Substrate
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/substrate/substrate.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-substrate',
  templateUrl: './substrate.component.html',
  styleUrl: './substrate.component.scss',
  standalone: false,
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

  svg = viewChild<ElementRef<SVGElement>>('svg');

  rippleShape = viewChild<ElementRef<SVGCircleElement>>('ripple');

  clip = viewChild<ElementRef<SVGClipPathElement>>('clip');

  clipUse = viewChild<ElementRef<SVGUseElement>>('clipUse');

  shape = viewChild<ElementRef<SVGUseElement>>('shape');

  hilight = viewChild<ElementRef<SVGUseElement>>('hilight');

  path = viewChild<ElementRef<SVGPathElement>>('path');

  fillGradient = viewChild<ElementRef<SVGPathElement>>('fillGradient');

  strokeGradient = viewChild<ElementRef<SVGPathElement>>('strokeGradient');

  fillGradientColor1 = viewChild<ElementRef<SVGStopElement>>('fillGradientColor1');

  fillGradientColor2 = viewChild<ElementRef<SVGStopElement>>('fillGradientColor2');

  strokeGradientColor1 = viewChild<ElementRef<SVGStopElement>>('strokeGradientColor1');

  strokeGradientColor2 = viewChild<ElementRef<SVGStopElement>>('strokeGradientColor2');

  strokeAnimation = viewChild<ElementRef<SVGAnimateTransformElement>>('strokeAnimation');

  mode = input.required<SubstarateMode>();

  width = input.required<number>();

  height = input.required<number>();

  roundCorner = input<RoundedCorner | undefined>(undefined);

  type = input<SubstarateStyle>(SubstarateStyles.NONE);

  strokeColors = input<string | GradientColor | undefined>();

  strokeWidth = input<number>(DEFAULT_STROKE_WIDTH);

  strokeAnimationDuration = input<number>(DEFAULT_STROKE_ANIMATION_DURATION);

  rippleColor = input<Color | undefined>(DEFAULT_RIPPLE_COLOR);

  fillColors = input<string | GradientColor | undefined>(DEFAULT_FILL_COLORS);

  fillPositions = input<GradientColorPositions | undefined>(undefined);

  rippleEnabled = signal<boolean>(false);

  private _destroyRef = inject(DestroyRef);

  private _elementRef = inject(ElementRef<HTMLDivElement>);

  constructor() {
    this._id = SubstrateComponent.nextId;

    effect(() => {
      const fillColors = this.fillColors();
      if (Array.isArray(fillColors) && fillColors.length === 2) {
        const fillGradientColor1 = this.fillGradientColor1(), fillGradientColor2 = this.fillGradientColor2();
        if (fillGradientColor1 && fillGradientColor2) {
          fillGradientColor1.nativeElement.setAttribute(GRADIENT_COLOR_NAME, `${fillColors[0]}`);
          fillGradientColor2.nativeElement.setAttribute(GRADIENT_COLOR_NAME, `${fillColors[1]}`);

          const shape = this.shape()?.nativeElement;
          if (shape) {
            shape.setAttribute(FILL, `url(#${FILL_GRADIENT_NAME}${this._id})`);
          }
        }
      } else {
        const shape = this.shape()?.nativeElement;
        if (shape) {
          shape.setAttribute(FILL, INHERIT);
        }
      }
    });

    effect(() => {
      const strokeWidth = this.strokeWidth(), shape = this.shape()?.nativeElement;
      if (shape) {
        shape.setAttribute(STROKE_WIDTH, `${strokeWidth}`);
      }
    });

    effect(() => {
      const strokeWidth = this.strokeWidth(), path = this.path()?.nativeElement;
      if (path) {
        path.setAttribute(STROKE_WIDTH, `${strokeWidth * 2}`);
      }
    });

    effect(() => {
      const strokeWidth = this.strokeWidth(), hilight = this.hilight()?.nativeElement;
      if (hilight) {
        hilight.setAttribute(STROKE_WIDTH, `${strokeWidth * 2}`);
      }
    });

    effect(() => {
      const strokeAnimationDuration = this.strokeAnimationDuration(), strokeAnimation = this.strokeAnimation()?.nativeElement;
      if (strokeAnimation) {
        strokeAnimation.setAttribute(DUR, `${strokeAnimationDuration ?? DEFAULT_STROKE_ANIMATION_DURATION}${MS}`);
      }
    });

    effect(() => {
      const fillPositions = this.fillPositions();
      if (Array.isArray(fillPositions) && fillPositions.length === 2) {
        const fillGradient = this.fillGradient();
        if (fillGradient) {
          fillGradient.nativeElement.setAttribute(X1, `${fillPositions[0]}${PX}`);
          fillGradient.nativeElement.setAttribute(X2, `${fillPositions[1]}${PX}`);
        }
      }
    });

    effect(() => {
      const strokeColors = this.strokeColors();
      if (Array.isArray(strokeColors) && strokeColors.length === 2) {
        const strokeGradientColor1 = this.strokeGradientColor1(), strokeGradientColor2 = this.strokeGradientColor2();
        if (strokeGradientColor1 && strokeGradientColor2) {
          strokeGradientColor1.nativeElement.setAttribute(GRADIENT_COLOR_NAME, `${strokeColors[0]}`);
          strokeGradientColor2.nativeElement.setAttribute(GRADIENT_COLOR_NAME, `${strokeColors[1]}`);
        }
      }
    });

    effect(() => {
      const fillGradient = this.fillGradient();
      if (fillGradient) {
        fillGradient.nativeElement.setAttribute(ID, `${FILL_GRADIENT_NAME}${this._id}`);
      }
    });

    effect(() => {
      const strokeGradient = this.strokeGradient();
      if (strokeGradient) {
        strokeGradient.nativeElement.setAttribute(ID, `${STROKE_GRADIENT_NAME}${this._id}`);
      }
    });

    effect(() => {
      const path = this.path();
      if (path) {
        path.nativeElement.setAttribute(ID, `${SHAPE_NAME}${this._id}`);
      }
    });

    effect(() => {
      const clip = this.clip();
      if (clip) {
        clip.nativeElement.setAttribute(ID, `${CLIP_NAME}${this._id}`);
      }
    });

    effect(() => {
      const clipUse = this.clipUse();
      if (clipUse) {
        clipUse.nativeElement.setAttribute(HREF, `#${SHAPE_NAME}${this._id}`);
      }
    });

    effect(() => {
      const shape = this.shape();
      if (shape) {
        shape.nativeElement.setAttribute(CLIP_PATH, `url(#${CLIP_NAME}${this._id})`);
        shape.nativeElement.setAttribute(HREF, `#${SHAPE_NAME}${this._id}`);
      }
    });

    effect(() => {
      const hilight = this.hilight();
      if (hilight) {
        hilight.nativeElement.setAttribute(CLIP_PATH, `url(#${CLIP_NAME}${this._id})`);
        hilight.nativeElement.setAttribute(HREF, `#${SHAPE_NAME}${this._id}`);
      }
    });

    effect(() => {
      const rippleShape = this.rippleShape();
      if (rippleShape) {
        rippleShape.nativeElement.setAttribute(CLIP_PATH, `url(#${CLIP_NAME}${this._id})`);
      }
    });

    effect(() => {
      const svg = this.svg()?.nativeElement, path = this.path()?.nativeElement, roundCorner = this.roundCorner(), minSize = getShapeMinSize(roundCorner),
        ww = (this.width() || minSize), w = ww >= minSize ? ww : minSize,
        hh = (this.height() || minSize), h = hh >= minSize ? hh : minSize;
      if (svg && path) {
        svg.style.width = `${w}${PX}`;
        svg.style.height = `${h}${PX}`;
        svg.setAttribute(VIEW_BOX, `0 0 ${w} ${h}`);
        switch (this.mode()) {
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
    });

    effect(() => {
      const type = this.type(), shape = this.shape()?.nativeElement;
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
    });

    effect(() => {
      const type = this.type(), hilight = this.hilight()?.nativeElement;
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
    });

    const $rippleShape = toObservable(this.rippleShape),
      $rippleEnabled = toObservable(this.rippleEnabled);

    $rippleShape.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      map(v => v.nativeElement),
      switchMap(rippleShape => {
        return $rippleEnabled.pipe(
          takeUntilDestroyed(this._destroyRef),
          filter(v => !!v),
          tap(() => {
            if (rippleShape) {
              rippleShape.classList.add(RIPPLE_ANIMATE_CLASS);
            }
          }),
          delay(800),
          takeUntilDestroyed(this._destroyRef),
          tap(() => {
            rippleShape.classList.remove(RIPPLE_ANIMATE_CLASS);
            this.rippleEnabled.set(false);
          }),
        );
      }),
    ).subscribe();
  }

  ripple(e: PointerEvent | MouseEvent) {
    const { x, y, width, height } = (this._elementRef.nativeElement as HTMLDivElement).getBoundingClientRect(),
      localX = e.clientX - x, localY = e.clientY - y, rippleColor = this.rippleColor() ?? DEFAULT_RIPPLE_COLOR, endRadius = Math.max(width, height);
    const rippleShape = this.rippleShape()?.nativeElement;
    if (rippleShape) {
      rippleShape.setAttribute(CX, String(localX));
      rippleShape.setAttribute(CY, String(localY));
      rippleShape.setAttribute(R, String(endRadius));
      rippleShape.setAttribute(FILL, rippleColor);
    }
    this.rippleEnabled.set(true);
  }
}
