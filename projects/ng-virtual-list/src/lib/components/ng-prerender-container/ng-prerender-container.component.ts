import {
    ChangeDetectionStrategy, Component, Input, TemplateRef, ViewChild, ViewEncapsulation,
} from "@angular/core";
import { filter, Observable, of, switchMap, takeUntil } from "rxjs";
import {
    DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE, DEFAULT_ITEM_SIZE, DEFAULT_SCROLLBAR_ENABLED, TRACK_BY_PROPERTY_NAME,
} from "../../const";
import { ISize } from '../../interfaces';
import { IVirtualListCollection } from "../../models";
import { Direction } from "../../enums";
import { NgPrerenderList } from "./components/ng-prerender-list/ng-prerender-list.component";
import { PrerenderCache } from "./types";
import { DisposableComponent } from "../../utils/disposable-component";

/**
 * Prerender container.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/ng-prerender-container/ng-prerender-container.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'ng-prerender-container',
    templateUrl: './ng-prerender-container.component.html',
    styleUrls: ['../../ng-virtual-list.component.scss', './ng-prerender-container.component.scss'],
    host: {
        'style': 'position: relative;'
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.ShadowDom,
})
export class NgPrerenderContainer extends DisposableComponent {
    @ViewChild('list', { read: NgPrerenderList })
    private _list: NgPrerenderList | null = null;

    @Input()
    enabled: boolean = false;

    @Input()
    direction: Direction = DEFAULT_DIRECTION;

    @Input()
    isVertical: boolean = true;

    @Input()
    scrollbarEnabled: boolean = DEFAULT_SCROLLBAR_ENABLED;

    @Input()
    startOffset: number = 0;

    @Input()
    endOffset: number = 0;

    @Input()
    bounds!: ISize;

    @Input()
    dynamic: boolean = DEFAULT_DYNAMIC_SIZE;

    @Input()
    itemSize: number = DEFAULT_ITEM_SIZE;

    @Input()
    trackBy: string = TRACK_BY_PROPERTY_NAME;

    @Input()
    itemRenderer!: TemplateRef<any>;

    $render!: Observable<PrerenderCache>;

    get active() {
        return this._list?.active ?? false;
    }

    constructor() {
        super();
    }

    ngAfterViewInit() {
        const $list = of(this._list);

        this.$render = $list.pipe(
            takeUntil(this._$unsubscribe),
            filter(v => !!v),
            switchMap(v => v!.$render),
        );
    }

    clear() {
        const list = this._list;
        if (!!list) {
            list.clear();
        }
    }

    on(items: IVirtualListCollection | null = null) {
        const list = this._list;
        if (!!list) {
            list.on(items);
        }
    }

    off() {
        const list = this._list;
        if (!!list) {
            list.off();
        }
    }
}