import {
    ChangeDetectionStrategy, Component, input, TemplateRef, viewChild, ViewEncapsulation,
} from "@angular/core";
import {
    DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE, DEFAULT_ITEM_SIZE, DEFAULT_SCROLLBAR_ENABLED, TRACK_BY_PROPERTY_NAME,
} from "../../const";
import { ISize } from '../../interfaces';
import { IVirtualListCollection } from "../../models";
import { ScrollBarTheme } from "../../types";
import { Direction } from "../../enums";
import { PrerenderList } from "./components/prerender-list/prerender-list.component";
import { filter, Observable, switchMap } from "rxjs";
import { PrerenderCache } from "./types";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";

/**
 * Prerender container.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/prerender-container/prerender-container.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'prerender-container',
    templateUrl: './prerender-container.component.html',
    styleUrls: ['../../ng-virtual-list.component.scss', './prerender-container.component.scss'],
    host: {
        'style': 'position: relative;'
    },
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.ShadowDom,
})
export class PrerenderContainer {
    private _list = viewChild<PrerenderList>('list');

    enabled = input<boolean>(false);

    direction = input<Direction>(DEFAULT_DIRECTION);

    isVertical = input<boolean>(true);

    items = input.required<IVirtualListCollection>();

    scrollbarEnabled = input<boolean>(DEFAULT_SCROLLBAR_ENABLED);

    scrollbarTheme = input<ScrollBarTheme | null>(null);

    startOffset = input<number>(0);

    endOffset = input<number>(0);

    bounds = input.required<ISize>();

    dynamic = input<boolean>(DEFAULT_DYNAMIC_SIZE);

    itemSize = input<number>(DEFAULT_ITEM_SIZE);

    trackBy = input<string>(TRACK_BY_PROPERTY_NAME);

    itemRenderer = input<TemplateRef<any>>();

    readonly $render: Observable<PrerenderCache>;

    get active() {
        return this._list()?.active ?? false;
    }

    constructor() {
        const $list = toObservable(this._list);

        this.$render = $list.pipe(
            takeUntilDestroyed(),
            filter(v => !!v),
            switchMap(v => v.$render),
        );
    }

    clear() {
        const list = this._list();
        if (!!list) {
            list.clear();
        }
    }

    on() {
        const list = this._list();
        if (!!list) {
            list.on();
        }
    }

    off() {
        const list = this._list();
        if (!!list) {
            list.off();
        }
    }
}