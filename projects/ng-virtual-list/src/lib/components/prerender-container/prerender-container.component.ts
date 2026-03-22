import {
    ChangeDetectionStrategy, Component, ElementRef, inject, input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation,
} from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { toggleClassName } from "ng-virtual-list";
import { combineLatest, filter, Subject, tap } from "rxjs";
import { CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DYNAMIC_SIZE, DEFAULT_ITEM_SIZE, TRACK_BY_PROPERTY_NAME } from "../../const";
import { IVirtualListCollection } from "../../models";
import { ISize } from "../../types";
import { PrerenderCache } from "./types/cache";
import { BaseVirtualListItemComponent } from "../../models/base-virtual-list-item-component";
import { Component$1 } from "../../models/component.model";
import { NgVirtualListItemComponent } from "../list-item/ng-virtual-list-item.component";
import { PrerenderTrackBox } from "./core";
import { PrerenderTrackBoxEvents } from "./events";

/**
 * Prerender container.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/prerender-container/prerender-container.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'prerender-container',
    templateUrl: './prerender-container.component.html',
    styleUrl: '../../ng-virtual-list.component.scss',
    host: {
        'style': 'position: relative;'
    },
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.ShadowDom,
})
export class PrerenderContainer implements OnDestroy {
    @ViewChild('renderersContainer', { read: ViewContainerRef })
    private _listContainerRef: ViewContainerRef | undefined;

    isVertical = input<boolean>(true);

    items = input.required<IVirtualListCollection>();

    bounds = input.required<ISize>();

    dynamic = input<boolean>(DEFAULT_DYNAMIC_SIZE);

    itemSize = input<number>(DEFAULT_ITEM_SIZE);

    trackBy = input<string>(TRACK_BY_PROPERTY_NAME);

    itemRenderer = input<TemplateRef<any>>();

    itemComponentClass = input<Component$1<BaseVirtualListItemComponent>>(NgVirtualListItemComponent);

    private _$render = new Subject<PrerenderCache>();
    $render = this._$render.asObservable();

    private _$componentResize = new Subject<PrerenderCache>();
    protected $componentResize = this._$componentResize.asObservable();

    private _trackBox: PrerenderTrackBox | null = new PrerenderTrackBox();

    private _onTrackBoxResizeHandler = (cache: PrerenderCache) => {
        this._$componentResize.next(cache);
    };

    private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    get active() { return this._trackBox?.active ?? false; }

    constructor() {
        this._trackBox!.addEventListener(PrerenderTrackBoxEvents.RESIZE, this._onTrackBoxResizeHandler);

        const $isVertical = toObservable(this.isVertical);
        $isVertical.pipe(
            takeUntilDestroyed(),
            tap(v => {
                const el = this._elementRef.nativeElement;
                toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, v ? CLASS_LIST_HORIZONTAL : CLASS_LIST_VERTICAL);
            }),
        ).subscribe();

        const $items = toObservable(this.items),
            $bounds = toObservable(this.bounds);
        $bounds.pipe(
            takeUntilDestroyed(),
            filter(v => !!v),
            tap(({ width, height }) => {
                const el = this._elementRef.nativeElement;
                el.style.width = `${width}px`;
                el.style.height = `${height}px`;
            }),
        ).subscribe();

        combineLatest([$bounds, $items]).pipe(
            takeUntilDestroyed(),
            filter(([b, i]) => !!b && !!i),
            tap(([bounds, items]) => {
                if (this.active && !!this._trackBox) {
                    this._trackBox.reset(this.itemComponentClass(), items, bounds, {
                        itemRenderer: this.itemRenderer(),
                        dynamic: this.dynamic(),
                        itemSize: this.itemSize(),
                        isVertical: this.isVertical(),
                        trackBy: this.trackBy(),
                    });
                }
            }),
        ).subscribe();

        const $componentResize = this.$componentResize;
        $componentResize.pipe(
            takeUntilDestroyed(),
            tap(cache => {
                this._$render.next(cache);
            }),
        ).subscribe();
    }

    clear() {
        if (!!this._trackBox) {
            this._trackBox.clear();
        }
    }

    on() {
        if (!!this._trackBox) {
            this._trackBox.on();
        }
    }

    off() {
        if (!!this._trackBox) {
            this._trackBox.off();
        }
    }

    ngAfterViewInit() {
        this._trackBox!.create(this._listContainerRef!);
    }

    ngOnDestroy(): void {
        this.dispose();
    }

    dispose() {
        if (!!this._trackBox) {
            this._trackBox.dispose();
            this._trackBox = null;
        }
    }
}