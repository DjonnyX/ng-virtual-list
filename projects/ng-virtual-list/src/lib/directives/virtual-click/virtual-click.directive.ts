import { Directive, ElementRef, inject, Input, Output, OnDestroy, EventEmitter } from '@angular/core';
import { Subject, BehaviorSubject, combineLatest, fromEvent, of, race } from 'rxjs';
import { filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NgVirtualListService } from '../../ng-virtual-list.service';
import { DEFAULT_CLICK_DISTANCE } from '../../const';

/**
 * VirtualClickDirective
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/17.x/projects/ng-virtual-list/src/lib/directives/item-click/item-click.directive.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Directive({
    selector: '[virtualClick]',
    standalone: false,
})
export class VirtualClickDirective implements OnDestroy {
    protected _$unsubscribe = new Subject<void>();

    private _$maxDistance = new BehaviorSubject<number | null>(null);
    protected $maxDistance = this._$maxDistance.asObservable();

    private _maxDistance: number | null = null;

    @Input('maxClickDistance')
    set maxDistance(v: number | string) {
        const value = (v !== null || v !== undefined) ? Number(v) : null;
        this._maxDistance = value;
        this._$maxDistance.next(value);
    }

    @Output()
    onVirtualClick = new EventEmitter<PointerEvent | TouchEvent>();

    @Output()
    onVirtualClickPress = new EventEmitter<PointerEvent | TouchEvent>();

    @Output()
    onVirtualClickCancel = new EventEmitter<void>();

    private _service = inject(NgVirtualListService);

    private _elementRef = inject(ElementRef);

    constructor() {
        let maxDistance = this._maxDistance ?? DEFAULT_CLICK_DISTANCE;
        combineLatest([this._service.$clickDistance, this.$maxDistance]).pipe(
            takeUntil(this._$unsubscribe),
            tap(([clickDistance, distance]) => {
                maxDistance = distance === null ? clickDistance : distance;
            }),
        ).subscribe();

        const $pointerPressed = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerdown'),
            $pointerCancel = race([
                fromEvent(window, 'pointerup').pipe(
                    takeUntil(this._$unsubscribe),
                ),
                fromEvent<PointerEvent>(window, 'pointerleave').pipe(
                    takeUntil(this._$unsubscribe),
                ),
            ]),
            $pointerRelease = fromEvent<PointerEvent>(this._elementRef.nativeElement, 'pointerup', { passive: false });

        $pointerPressed.pipe(
            takeUntil(this._$unsubscribe),
            switchMap(e => {
                const x = Math.abs(e.clientX),
                    y = Math.abs(e.clientY);
                this.onVirtualClickPress.emit(e);
                return $pointerRelease.pipe(
                    takeUntil(this._$unsubscribe),
                    takeUntil(
                        race([
                            $pointerCancel.pipe(
                                takeUntil(this._$unsubscribe),
                                tap(() => {
                                    this.onVirtualClickCancel.emit();
                                }),
                            ),
                            fromEvent<PointerEvent>(window, 'pointermove').pipe(
                                takeUntil(this._$unsubscribe),
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
                    takeUntil(this._$unsubscribe),
                    tap(e => {
                        if (e) {
                            this.onVirtualClick.emit(e);
                        }
                    }),
                );
            }),
        ).subscribe();
    }

    ngOnDestroy(): void {
        if (this._$unsubscribe) {
            this._$unsubscribe.next();
            this._$unsubscribe.complete();
        }
    }
}
