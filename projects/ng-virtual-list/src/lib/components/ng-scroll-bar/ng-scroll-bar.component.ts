import { Component, computed, effect, ElementRef, inject, input, output, Signal, signal, TemplateRef, viewChild } from '@angular/core';
import { combineLatest, filter, fromEvent, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { IScrollBarDragEvent, IScrollBarTemplateContext } from './interfaces';
import { DEFAULT_SCROLLBAR_INTERACTIVE } from '../../const';
import {
  DEFAULT_SIZE, DEFAULT_THICKNESS, HEIGHT, NONE, OPACITY, OPACITY_0, OPACITY_1, PX, TRANSITION, TRANSITION_FADE_IN, WIDTH,
} from './const';
import { SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO } from '../ng-scroll-view/const';
import { NgScrollBarService } from './ng-scroll-bar.service';
import { NgScrollBarPublicService } from './ng-scroll-bar-public.service';
import { ScrollbarStates } from './enums';

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
    { provide: SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, useValue: false },
    NgScrollBarService,
    NgScrollBarPublicService,
  ],
  standalone: false,
  templateUrl: './ng-scroll-bar.component.html',
  styleUrl: './ng-scroll-bar.component.scss'
})
export class NgScrollBarComponent extends NgScrollView {
  protected _defaultRenderer = viewChild<TemplateRef<any>>('defaultRenderer');

  protected _service = inject(NgScrollBarService);

  private _apiService = inject(NgScrollBarPublicService);

  readonly loading = input<boolean>(false);

  readonly onDrag = output<IScrollBarDragEvent>();

  readonly onDragEnd = output<IScrollBarDragEvent>();

  readonly thumbGradientPositions = input<GradientColorPositions>([0, 0]);

  readonly size = input<number>(DEFAULT_SIZE);

  readonly thickness = input<number>(DEFAULT_THICKNESS);

  readonly scrollbarMinSize = input<number>(0);

  readonly prepared = input<boolean>(false);

  readonly interactive = input<boolean>(DEFAULT_SCROLLBAR_INTERACTIVE);

  readonly show = input<boolean>(false);

  readonly params = input<{ [propName: string]: any } | null>({});

  readonly renderer = input<TemplateRef<any> | null>(null);

  readonly thumbRenderer = signal<TemplateRef<any> | null>(this._defaultRenderer() ?? null);

  protected readonly hoverState = signal<boolean>(false);

  protected readonly pressedState = signal<boolean>(false);

  protected readonly templateContext!: Signal<IScrollBarTemplateContext>;

  protected readonly styles: Signal<{ [sName: string]: any }>;

  protected readonly thumbWidth: Signal<number>;

  protected readonly thumbHeight: Signal<number>;

  private _$scrollingCancel = new Subject<void>();
  protected readonly $scrollingCancel = this._$scrollingCancel.asObservable();

  private _elementRef = inject(ElementRef);

  constructor() {
    super();

    this.templateContext = computed(() => {
      const context: IScrollBarTemplateContext = {
        api: this._apiService,
        width: this.thumbWidth(),
        height: this.thumbHeight(),
        fillPositions: this.thumbGradientPositions(),
        params: this.params() ?? {},
      };
      return context;
    });

    const $renderer = toObservable(this.renderer).pipe(
        startWith(null),
      ),
      $defaultRenderer = toObservable(this._defaultRenderer);

    combineLatest([$renderer, $defaultRenderer]).pipe(
      takeUntilDestroyed(),
      switchMap(([renderer, defaultRenderer]) => {
        return of((renderer ?? defaultRenderer) ?? null);
      }),
      tap(v => {
        this.thumbRenderer.set(v);
      }),
    ).subscribe();

    const $prepared = toObservable(this.prepared);
    $prepared.pipe(
      takeUntilDestroyed(),
      filter(v => !!v),
      tap(() => {
        this.scrollLimits();
        this.refreshX(this._x);
        this.refreshY(this._y);
        this.fireScrollEvent(false);
      }),
    ).subscribe();

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

    effect(() => {
      const pressed = this.pressedState(), hover = this.hoverState();
      if (pressed) {
        this._service.state = ScrollbarStates.PRESSED;
        return;
      } else if (hover) {
        this._service.state = ScrollbarStates.HOVER;
        return;
      }
      this._service.state = ScrollbarStates.NORMAL;
      return;
    });

    effect(() => {
      this.totalSize = this.size();
    });

    effect(() => {
      this._interactive = this.interactive();
    });

    this.styles = computed(() => {
      const show = this.show(), sizePropName = this.isVertical() ? WIDTH : HEIGHT;
      return {
        [sizePropName]: `${show ? this.thickness() : 0}${PX}`,
        [OPACITY]: show ? OPACITY_1 : OPACITY_0, [TRANSITION]: show ? TRANSITION_FADE_IN : NONE,
      };
    });

    this.$scroll.pipe(
      takeUntilDestroyed(),
      tap(v => {
        const event = this.createDragEvent(v);
        if (!!event) {
          this.onDrag.emit(event);
        }
      }),
    ).subscribe();

    const $scrollEnd = this.$scrollEnd;
    $scrollEnd.pipe(
      takeUntilDestroyed(),
      tap(() => {
        const event = this.createDragEvent(false);
        if (!!event) {
          this.onDragEnd.emit(event);
        }
      }),
    ).subscribe();
  }

  private createDragEvent(userAction: boolean) {
    const isVertical = this.isVertical(), scrollSize = isVertical ? this.scrollHeight : this.scrollWidth,
      scrollContent = this.scrollContent()?.nativeElement as HTMLElement,
      scrollViewport = this.scrollViewport()?.nativeElement as HTMLDivElement;
    if (!!scrollViewport && !!scrollContent) {
      const contentSize = isVertical ? scrollContent.offsetHeight : scrollContent.offsetWidth,
        viewportSize = isVertical ? scrollViewport.offsetHeight : scrollViewport.offsetWidth;
      const event: IScrollBarDragEvent = {
        position: scrollSize !== 0 ? ((isVertical ? this._y : this._x) / scrollSize) : 0,
        min: scrollSize !== 0 ? (this.startOffset() / scrollSize) : 0,
        max: scrollSize !== 0 ? ((viewportSize - this.endOffset() - contentSize) / scrollSize) : 0,
        animation: !this._isMoving,
        userAction,
      };
      return event;
    }
    return null;
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

  click(event: PointerEvent | MouseEvent) {
    this._service.click(event);
  }
}
