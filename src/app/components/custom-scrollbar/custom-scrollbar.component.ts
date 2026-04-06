import { Component, Input, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, switchMap, takeUntil, tap } from 'rxjs';
import { CustomScrollBarTheme } from './interfaces/custom-scrollbar-theme';
import { DEFAULT_SCROLLBAR_THEME } from './const';
import { Color, GradientColor } from '../interfaces';
import { SubstarateStyle, SubstarateStyles, XSubstrateComponent } from '../x-substrate';
import { GradientColorPositions, NgScrollBarPublicService, ScrollbarStates } from '../../../../projects/ng-virtual-list/src/public-api';
import { DisposableComponent } from 'projects/ng-virtual-list/src/lib/utils/disposable-component';

/**
 * ScrollBar component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/src/app/components/custom-scrollbar/custom-scrollbar.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'custom-scrollbar',
    templateUrl: './custom-scrollbar.component.html',
    styleUrls: ['./custom-scrollbar.component.scss'],
})
export class CustomScrollbarComponent extends DisposableComponent {
    @ViewChild('substrate', { read: XSubstrateComponent })
    readonly substrate: XSubstrateComponent | null = null;

    private _$api = new BehaviorSubject<NgScrollBarPublicService | null>(null);
    protected readonly $api = this._$api.asObservable();

    @Input()
    set api(v: NgScrollBarPublicService | null) {
        if (this._$api.getValue() !== v) {
            this._$api.next(v);
        }
    }
    get api() { return this._$api.getValue(); }

    @Input()
    width: number = 0;

    @Input()
    height: number = 0;

    @Input()
    fillPositions: GradientColorPositions = [0, 1];

    private _$params = new BehaviorSubject<CustomScrollBarTheme>(DEFAULT_SCROLLBAR_THEME);
    protected readonly $params = this._$params.asObservable();

    @Input()
    set params(v: CustomScrollBarTheme) {
        if (this._$params.getValue() !== v) {
            this._$params.next(v);
        }
    }
    get params() { return this._$params.getValue(); }

    private _$loading = new BehaviorSubject<boolean>(false);
    protected readonly $loading = this._$loading.asObservable();

    @Input()
    set loading(v: boolean) {
        if (this._$loading.getValue() !== v) {
            this._$loading.next(v);
        }
    }
    get loading() { return this._$loading.getValue(); }

    private _$type = new BehaviorSubject<SubstarateStyle>(SubstarateStyles.NONE);
    protected readonly $type = this._$type.asObservable();

    private _$fillColors = new BehaviorSubject<Color | GradientColor>(DEFAULT_SCROLLBAR_THEME.fill);
    protected readonly $fillColors = this._$fillColors.asObservable();

    constructor() {
        super();

        const $loading = this.$loading;
        $loading.pipe(
            takeUntil(this._$unsubscribe),
            tap(v => {
                this._$type.next(v ? SubstarateStyles.STROKE : SubstarateStyles.NONE);
            })
        ).subscribe();

        const $api = this.$api,
            $state = $api.pipe(
                takeUntil(this._$unsubscribe),
                filter(v => !!v),
                switchMap(v => {
                    return v!.$state;
                }),
            ),
            $click = $api.pipe(
                takeUntil(this._$unsubscribe),
                filter(v => !!v),
                switchMap(v => {
                    return v!.$click;
                }),
            );

        const $params = this.$params;
        combineLatest([$state, $params]).pipe(
            takeUntil(this._$unsubscribe),
            tap(([state, params]) => {
                const pressed = state === ScrollbarStates.PRESSED, hover = state === ScrollbarStates.HOVER;
                if (pressed) {
                    this._$fillColors.next(params.pressedFill);
                    return;
                } else if (hover) {
                    this._$fillColors.next(params.hoverFill);
                    return;
                }
                this._$fillColors.next(params.fill);
                return;
            }),
        ).subscribe();

        $click.pipe(
            takeUntil(this._$unsubscribe),
            tap(event => {
                this.substrate?.ripple(event as PointerEvent);
            }),
        ).subscribe();
    }
}
