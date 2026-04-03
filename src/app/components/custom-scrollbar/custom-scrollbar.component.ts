import { Component, computed, input, Signal, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import { NgScrollBarPublicService, GradientColorPositions, ScrollbarStates } from '../../../../projects/ng-virtual-list/src/public-api';
import { CustomScrollBarTheme } from './interfaces/custom-scrollbar-theme';
import { DEFAULT_SCROLLBAR_THEME } from './const';
import { Color, GradientColor } from '../interfaces';
import { SubstarateStyle, SubstarateStyles, XSubstrateComponent } from '../x-substrate';

/**
 * ScrollBar component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/src/app/components/custom-scrollbar/custom-scrollbar.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'custom-scrollbar',
    standalone: false,
    templateUrl: './custom-scrollbar.component.html',
})
export class CustomScrollbarComponent {
    readonly substrate = viewChild(XSubstrateComponent);

    readonly api = input<NgScrollBarPublicService>();

    readonly width = input<number>(0);

    readonly height = input<number>(0);

    readonly fillPositions = input<GradientColorPositions>([0, 1]);

    readonly params = input<CustomScrollBarTheme>(DEFAULT_SCROLLBAR_THEME);

    readonly loading = input<boolean>(false);

    protected type: Signal<SubstarateStyle>;

    protected fillColors = signal<Color | GradientColor>(DEFAULT_SCROLLBAR_THEME.fill);

    constructor() {
        this.type = computed(() => {
            return this.loading() ? SubstarateStyles.STROKE : SubstarateStyles.NONE;
        });

        const $api = toObservable(this.api),
            $state = $api.pipe(
                takeUntilDestroyed(),
                distinctUntilChanged(),
                filter(v => !!v),
                switchMap(v => {
                    return v.$state;
                }),
            ),
            $click = $api.pipe(
                takeUntilDestroyed(),
                distinctUntilChanged(),
                filter(v => !!v),
                switchMap(v => {
                    return v.$click;
                }),
            );

        $state.pipe(
            takeUntilDestroyed(),
            tap(v => {
                const pressed = v === ScrollbarStates.PRESSED, hover = v === ScrollbarStates.HOVER;
                if (pressed) {
                    this.fillColors.set(this.params().pressedFill);
                    return;
                } else if (hover) {
                    this.fillColors.set(this.params().hoverFill);
                    return;
                }
                this.fillColors.set(this.params().fill);
                return;
            }),
        ).subscribe();

        $click.pipe(
            takeUntilDestroyed(),
            tap(event => {
                this.substrate()?.ripple(event);
            }),
        ).subscribe();
    }
}
