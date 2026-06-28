import { DestroyRef, Directive, ElementRef, inject, Input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, fromEvent, of, race } from 'rxjs';
import { filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NgVirtualListService } from '../../ng-virtual-list.service';
import { DEFAULT_CLICK_DISTANCE } from '../../const';

/**
 * VirtualClickDirective
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/22.x/projects/ng-virtual-list/src/lib/directives/item-click/item-click.directive.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Directive({
    selector: '[virtualClick]',
    standalone: false,
})
export class VirtualClickDirective {
    private _$maxDistance = new BehaviorSubject<number | null>(null);
    protected $maxDistance = this._$maxDistance.asObservable();

    private _maxDistance: number | null = null;

    @Input('maxClickDistance')
    set maxDistance(v: number | string) {
        const value = (v !== null || v !== undefined) ? Number(v) : null;
        this._maxDistance = value;
        this._$maxDistance.next(value);
    }

    onVirtualClick = output<PointerEvent | TouchEvent>();

    onVirtualClickPress = output<PointerEvent | TouchEvent>();

    onVirtualClickCancel = output<void>();

    private _service = inject(NgVirtualListService);

    private _elementRef = inject(ElementRef);

    private _destroyRef = inject(DestroyRef);

    constructor() {
        let maxDistance = this._maxDistance ?? DEFAULT_CLICK_DISTANCE;
        combineLatest([this._service.$clickDistance, this.$maxDistance]).pipe(
            takeUntilDestroyed(),
            tap(([clickDistance, distance]) => {
                maxDistance = distance === null ? clickDistance : distance;
            }),
        ).subscribe();

        const $pointerPressed = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerdown'),
            $pointerCancel = race([
                fromEvent(window, 'pointerup').pipe(
                    takeUntilDestroyed(),
                ),
                fromEvent<PointerEvent>(window, 'pointerleave').pipe(
                    takeUntilDestroyed(),
                ),
            ]),
            $pointerRelease = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerup', { passive: false });

        $pointerPressed.pipe(
            takeUntilDestroyed(),
            switchMap(e => {
                const x = Math.abs(e.clientX),
                    y = Math.abs(e.clientY);
                this.onVirtualClickPress.emit(e);
                return $pointerRelease.pipe(
                    takeUntilDestroyed(this._destroyRef),
                    takeUntil(
                        race([
                            $pointerCancel.pipe(
                                takeUntilDestroyed(this._destroyRef),
                                tap(() => {
                                    this.onVirtualClickCancel.emit();
                                }),
                            ),
                            fromEvent<PointerEvent>(window, 'pointermove').pipe(
                                takeUntilDestroyed(this._destroyRef),
                                switchMap(e => {
                                    const xx = x - Math.abs(e.clientX),
                                        yy = y - Math.abs(e.clientY),
                                        dist = Math.sqrt(Math.pow(xx, 2) + Math.pow(yy, 2));

                                    if (dist > maxDistance) {
                                        this.onVirtualClickCancel.emit();
                                        return of(true);
                                    }

                                    return of(false);
                                }),
                                filter(v => !!v),
                            ),
                        ]),
                    ),
                    takeUntilDestroyed(this._destroyRef),
                    tap(e => {
                        if (e) {
                            this.onVirtualClick.emit(e);
                        }
                    }),
                );
            }),
        ).subscribe();
    }
}
