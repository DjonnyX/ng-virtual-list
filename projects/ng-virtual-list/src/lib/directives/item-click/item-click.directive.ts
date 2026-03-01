import { Directive, ElementRef, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { fromEvent, of, race, Subject } from 'rxjs';
import { filter, switchMap, takeUntil, tap } from 'rxjs/operators';

const DEFAULT_MAX_DISTANCE = 40;

/**
 * ItemClickDirective
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/directives/item-click/item-click.directive.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Directive({
    selector: '[itemClick]',
})
export class ItemClickDirective implements OnDestroy {
    protected _$unsubscribe = new Subject<void>();

    private _maxDistance = DEFAULT_MAX_DISTANCE;

    @Input('maxClickDistance')
    set maxDistance(v: number | null) {
        this._maxDistance = v ? Number(v) : DEFAULT_MAX_DISTANCE;
    }

    @Output()
    onClick = new EventEmitter<PointerEvent | TouchEvent>();

    constructor(private _elementRef: ElementRef) {
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
                return $pointerRelease.pipe(
                    takeUntil(this._$unsubscribe),
                    takeUntil(
                        race([
                            $pointerCancel,
                            fromEvent<PointerEvent>(window, 'pointermove').pipe(
                                takeUntil(this._$unsubscribe),
                                switchMap(e => {
                                    const xx = x - Math.abs(e.clientX),
                                        yy = y - Math.abs(e.clientY),
                                        dist = Math.sqrt(Math.pow(xx, 2) + Math.pow(yy, 2));

                                    if (dist > this._maxDistance) {
                                        return of(true);
                                    }

                                    return of(false);
                                }),
                                takeUntil(this._$unsubscribe),
                                filter(v => !!v),
                            ),
                        ]),
                    ),
                    takeUntil(this._$unsubscribe),
                    tap(e => {
                        if (e) {
                            this.onClick.emit(e);
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
