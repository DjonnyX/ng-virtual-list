import { Component, ElementRef, EventEmitter, inject, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, filter, fromEvent, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { GradientColorPositions } from '../../types/gradient-color-positions';
import { NgScrollView, SCROLL_VIEW_INVERSION } from '../ng-scroll-view';
import { IScrollBarDragEvent, IScrollBarTemplateContext } from './interfaces';
import { DEFAULT_SCROLLBAR_INTERACTIVE } from '../../const';
import {
  DEFAULT_SCROLLBAR_TEMPLATE_CONTEXT,
  DEFAULT_SIZE, DEFAULT_THICKNESS, HEIGHT, NONE, OPACITY, OPACITY_0, OPACITY_1, PX, TRANSITION, TRANSITION_FADE_IN, WIDTH,
} from './const';
import { SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO } from '../ng-scroll-view/const';
import { NgScrollBarService } from './ng-scroll-bar.service';
import { NgScrollBarPublicService } from './ng-scroll-bar-public.service';
import { ScrollbarStates } from './enums';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  providers: [
    { provide: SCROLL_VIEW_INVERSION, useValue: true },
    { provide: SCROLL_VIEW_NORMALIZE_VALUE_FROM_ZERO, useValue: false },
    NgScrollBarService,
    NgScrollBarPublicService,
  ],
  templateUrl: './ng-scroll-bar.component.html',
  styleUrls: ['./ng-scroll-bar.component.scss'],
})
export class NgScrollBarComponent extends NgScrollView {
  @ViewChild('defaultRenderer', { read: TemplateRef<any> })
  protected _defaultRenderer: TemplateRef<any> | undefined;

  protected _service = inject(NgScrollBarService);

  private _apiService = inject(NgScrollBarPublicService);

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

  private _$thickness = new BehaviorSubject<number>(DEFAULT_THICKNESS);
  readonly $thickness = this._$thickness.asObservable();

  @Input()
  set thickness(v: number) {
    if (this._$thickness.getValue() !== v) {
      this._$thickness.next(v);
    }
  }
  get thickness() { return this._$thickness.getValue(); }

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

  private _$params = new BehaviorSubject<{ [propName: string]: any } | null>({});
  readonly $params = this._$params.asObservable();

  @Input()
  set params(v: { [propName: string]: any } | null) {
    if (this._$params.getValue() !== v) {
      this._$params.next(v);
    }
  }
  get params() { return this._$params.getValue(); }

  private _$renderer = new BehaviorSubject<TemplateRef<any> | null>(null);
  readonly $renderer = this._$renderer.asObservable();

  @Input()
  set renderer(v: TemplateRef<any> | null) {
    if (this._$renderer.getValue() !== v) {
      this._$renderer.next(v);
    }
  }
  get renderer() { return this._$renderer.getValue(); }

  private _$thumbRenderer = new BehaviorSubject<TemplateRef<any> | null>(null);
  readonly $thumbRenderer = this._$thumbRenderer.asObservable();

  private _$hoverState = new BehaviorSubject<boolean>(false);
  readonly $hoverState = this._$hoverState.asObservable();

  private _$pressedState = new BehaviorSubject<boolean>(false);
  readonly $pressedState = this._$pressedState.asObservable();

  private _$classes = new BehaviorSubject<{ [className: string]: boolean }>({});
  readonly $classes = this._$classes.asObservable();
  private _$templateContext = new BehaviorSubject<IScrollBarTemplateContext>(DEFAULT_SCROLLBAR_TEMPLATE_CONTEXT);
  readonly $templateContext = this._$templateContext.asObservable();

  private _$styles = new BehaviorSubject<{ [styleName: string]: any }>({});
  readonly $styles = this._$styles.asObservable();

  private _$thumbWidth = new BehaviorSubject<number>(0);
  readonly $thumbWidth = this._$thumbWidth.asObservable();

  private _$thumbHeight = new BehaviorSubject<number>(0);
  readonly $thumbHeight = this._$thumbHeight.asObservable();

  private _$scrollingCancel = new Subject<void>();
  protected readonly $scrollingCancel = this._$scrollingCancel.asObservable();

  private _elementRef = inject(ElementRef);

  constructor() {
    super();

    const $thumbWidth = this.$thumbWidth,
      $thumbHeight = this.$thumbHeight,
      $thumbGradientPositions = this.$thumbGradientPositions,
      $params = this.$params;

    combineLatest([$thumbWidth, $thumbHeight, $thumbGradientPositions, $params]).pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(([thumbWidth, thumbHeight, thumbGradientPositions, params]) => {
        const context: IScrollBarTemplateContext = {
          api: this._apiService,
          width: thumbWidth,
          height: thumbHeight,
          fillPositions: thumbGradientPositions,
          params: params ?? {},
        };
        this._$templateContext.next(context);
      }),
    ).subscribe();

    const $prepared = this.$prepared;
    $prepared.pipe(
      takeUntilDestroyed(this._destroyRef),
      filter(v => !!v),
      tap(() => {
        this.scrollLimits();
        this.refreshX(this._x);
        this.refreshY(this._y);
        this.fireScrollEvent(false);
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

    const $renderer = this.$renderer.pipe(
      startWith(null),
    );

    $renderer.pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      debounceTime(0),
      switchMap(renderer => {
        return of((renderer ?? this._defaultRenderer) ?? null);
      }),
      tap(v => {
        this._$thumbRenderer.next(v);
      }),
    ).subscribe();

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
    );

    combineLatest([
      $pressedState, $hoverState,
    ]).pipe(
      takeUntilDestroyed(this._destroyRef),
      debounceTime(0),
      distinctUntilChanged(),
      tap(([pressed, hover]) => {
        if (pressed) {
          this._service.state = ScrollbarStates.PRESSED;
          return;
        } else if (hover) {
          this._service.state = ScrollbarStates.HOVER;
          return;
        }
        this._service.state = ScrollbarStates.NORMAL;
        return;
      }),
    ).subscribe();

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

    combineLatest([this.$show, this.$isVertical, this.$thickness]).pipe(
      takeUntilDestroyed(this._destroyRef),
      distinctUntilChanged(),
      tap(([show, isVertical, thickness]) => {
        const sizePropName = isVertical ? WIDTH : HEIGHT;
        this._$styles.next({
          [sizePropName]: `${show ? thickness : 0}${PX}`,
          [OPACITY]: show ? OPACITY_1 : OPACITY_0, [TRANSITION]: show ? TRANSITION_FADE_IN : NONE,
        });
      }),
    ).subscribe();

    this.$scroll.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(v => {
        const event = this.createDragEvent(v);
        if (!!event) {
          this.onDrag.emit(event);
        }
      }),
    ).subscribe();

    const $scrollEnd = this.$scrollEnd;
    $scrollEnd.pipe(
      takeUntilDestroyed(this._destroyRef),
      tap(() => {
        const event = this.createDragEvent(false);
        if (!!event) {
          this.onDragEnd.emit(event);
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

  click(event: PointerEvent | MouseEvent) {
    this._service.click(event);
  }
}
