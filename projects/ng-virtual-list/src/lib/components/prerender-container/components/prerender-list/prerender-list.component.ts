import {
    ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, inject, input, OnDestroy, signal, TemplateRef, ViewChild,
    ViewContainerRef, ViewEncapsulation,
} from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { toggleClassName } from "../../../../utils";
import { combineLatest, filter, Observable, Subject, Subscription, tap } from "rxjs";
import {
    CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE, DEFAULT_ITEM_SIZE,
    DEFAULT_SCROLLBAR_ENABLED, PX, TRACK_BY_PROPERTY_NAME,
} from "../../../../const";
import { ISize } from '../../../../interfaces';
import { IVirtualListCollection } from "../../../../models";
import { PrerenderCache } from "../../types/cache";
import { BaseVirtualListItemComponent } from "../../../list-item/base";
import { Component$1 } from "../../../../models/component.model";
import { PrerenderTrackBox } from "../../core";
import { PrerenderTrackBoxEvents } from "../../events";
import { PrerenderVirtualListItemComponent } from "../../components/prerender-list-item/prerender-list-item.component";
import { Direction } from "../../../../enums";

/**
 * PrerenderList.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/prerender-container/components/prerender-list/prerender-list.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'prerender-list',
    templateUrl: './prerender-list.component.html',
    styleUrls: ['../../../../ng-virtual-list.component.scss', './prerender-list.component.scss'],
    host: {
        'style': 'position: relative;'
    },
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.ShadowDom,
})
export class PrerenderList implements OnDestroy {
    @ViewChild('renderersContainer', { read: ViewContainerRef })
    private _listContainerRef: ViewContainerRef | undefined;

    enabled = input<boolean>(false);

    direction = input<Direction>(DEFAULT_DIRECTION);

    isVertical = input<boolean>(true);

    items = input.required<IVirtualListCollection>();

    scrollbarEnabled = input<boolean>(DEFAULT_SCROLLBAR_ENABLED);

    startOffset = input<number>(0);

    endOffset = input<number>(0);

    bounds = input.required<ISize>();

    dynamic = input<boolean>(DEFAULT_DYNAMIC_SIZE);

    itemSize = input<number>(DEFAULT_ITEM_SIZE);

    trackBy = input<string>(TRACK_BY_PROPERTY_NAME);

    itemRenderer = input<TemplateRef<any>>();

    itemComponentClass = input<Component$1<BaseVirtualListItemComponent>>(PrerenderVirtualListItemComponent);

    protected readonly classes = signal<{ [cName: string]: boolean }>({ prepared: true });

    private _$render = new Subject<PrerenderCache>();
    $render = this._$render.asObservable();

    private _$componentResize = new Subject<PrerenderCache>();
    protected $componentResize = this._$componentResize.asObservable();

    private _trackBox: PrerenderTrackBox | null = new PrerenderTrackBox();

    private _onTrackBoxResizeHandler = (cache: PrerenderCache) => {
        this._$componentResize.next(cache);
    };

    private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    protected $isVertical: Observable<boolean>;

    protected $items: Observable<IVirtualListCollection>;

    protected $bounds: Observable<ISize>;

    get active() { return this._trackBox?.active ?? false; }

    private _activated: boolean = false;

    private _subscriptions = new Array<Subscription>();

    private _destroyRef = inject(DestroyRef);

    constructor() {
        this.$isVertical = toObservable(this.isVertical);
        this.$items = toObservable(this.items);
        this.$bounds = toObservable(this.bounds);

        effect(() => {
            const enabled = this.enabled();
            if (enabled) {
                this.activate();
            } else {
                this.deactivate();
            }
        });
    }

    activate() {
        if (this._activated) {
            return;
        }
        this._activated = true;

        this._trackBox!.addEventListener(PrerenderTrackBoxEvents.RESIZE, this._onTrackBoxResizeHandler);

        this._subscriptions.push(this.$isVertical.pipe(
            takeUntilDestroyed(this._destroyRef),
            tap(v => {
                const el = this._elementRef.nativeElement;
                toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, v ? CLASS_LIST_HORIZONTAL : CLASS_LIST_VERTICAL);
            }),
        ).subscribe());

        this._subscriptions.push(this.$bounds.pipe(
            takeUntilDestroyed(this._destroyRef),
            filter(v => !!v),
            tap(({ width, height }) => {
                const el = this._elementRef.nativeElement;
                el.style.width = `${width}${PX}`;
                el.style.height = `${height}${PX}`;
            }),
        ).subscribe());

        this._subscriptions.push(combineLatest([this.$bounds, this.$items]).pipe(
            takeUntilDestroyed(this._destroyRef),
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
        ).subscribe());

        const $componentResize = this.$componentResize;
        this._subscriptions.push($componentResize.pipe(
            takeUntilDestroyed(this._destroyRef),
            tap(cache => {
                this._$render.next(cache);
            }),
        ).subscribe());
    }

    deactivate() {
        if (!this._activated) {
            return;
        }
        this._activated = false;

        this.off();

        if (!!this._trackBox) {
            this._trackBox!.removeEventListener(PrerenderTrackBoxEvents.RESIZE, this._onTrackBoxResizeHandler);
        }

        const subscriptions = this._subscriptions;
        for (const subscr of subscriptions) {
            if (!subscr.closed) {
                subscr.unsubscribe();
            }
        }
        this._subscriptions = [];
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
        this._subscriptions = [];

        if (!!this._trackBox) {
            this._trackBox.dispose();
            this._trackBox = null;
        }
    }
}