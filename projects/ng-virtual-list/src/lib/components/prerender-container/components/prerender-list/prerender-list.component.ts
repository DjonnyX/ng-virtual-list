import {
    ChangeDetectionStrategy, Component, ElementRef, inject, Input, OnDestroy, TemplateRef, ViewChild,
    ViewContainerRef, ViewEncapsulation,
} from "@angular/core";
import { toggleClassName } from "../../../../utils";
import { BehaviorSubject, combineLatest, filter, Subject, Subscription, takeUntil, tap } from "rxjs";
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
import { DisposableComponent } from "../../../../utils/disposable-component";

/**
 * PrerenderList.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/15.x/projects/ng-virtual-list/src/lib/prerender-container/components/prerender-list/prerender-list.component.ts
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.ShadowDom,
})
export class PrerenderList extends DisposableComponent implements OnDestroy {
    @ViewChild('renderersContainer', { read: ViewContainerRef })
    private _listContainerRef: ViewContainerRef | undefined;

    protected _$enabled = new BehaviorSubject<boolean>(false);
    readonly $enabled = this._$enabled.asObservable();
    @Input()
    set enabled(v: boolean) {
        if (this._$enabled.getValue() !== v) {
            this._$enabled.next(v);
        }
    }
    get enabled() { return this._$enabled.getValue(); }

    protected _$direction = new BehaviorSubject<Direction>(DEFAULT_DIRECTION);
    readonly $direction = this._$direction.asObservable();
    @Input()
    set direction(v: Direction) {
        if (this._$direction.getValue() !== v) {
            this._$direction.next(v);
        }
    }
    get direction() { return this._$direction.getValue(); }

    protected _$isVertical = new BehaviorSubject<boolean>(true);
    readonly $isVertical = this._$isVertical.asObservable();
    @Input()
    set isVertical(v: boolean) {
        if (this._$isVertical.getValue() !== v) {
            this._$isVertical.next(v);
        }
    }
    get isVertical() { return this._$isVertical.getValue(); }

    protected _$items = new BehaviorSubject<IVirtualListCollection>([]);
    readonly $items = this._$items.asObservable();
    @Input()
    set items(v: IVirtualListCollection) {
        if (this._$items.getValue() !== v) {
            this._$items.next(v);
        }
    }
    get items() { return this._$items.getValue(); }

    protected _$scrollbarEnabled = new BehaviorSubject<boolean>(DEFAULT_SCROLLBAR_ENABLED);
    readonly $scrollbarEnabled = this._$scrollbarEnabled.asObservable();
    @Input()
    set scrollbarEnabled(v: boolean) {
        if (this._$scrollbarEnabled.getValue() !== v) {
            this._$scrollbarEnabled.next(v);
        }
    }
    get scrollbarEnabled() { return this._$scrollbarEnabled.getValue(); }

    protected _$startOffset = new BehaviorSubject<number>(0);
    readonly $startOffset = this._$startOffset.asObservable();
    @Input()
    set startOffset(v: number) {
        if (this._$startOffset.getValue() !== v) {
            this._$startOffset.next(v);
        }
    }
    get startOffset() { return this._$startOffset.getValue(); }

    protected _$endOffset = new BehaviorSubject<number>(0);
    readonly $endOffset = this._$endOffset.asObservable();
    @Input()
    set endOffset(v: number) {
        if (this._$endOffset.getValue() !== v) {
            this._$endOffset.next(v);
        }
    }
    get endOffset() { return this._$endOffset.getValue(); }

    protected _$bounds = new BehaviorSubject<ISize | null>({ width: 0, height: 0 });
    readonly $bounds = this._$bounds.asObservable();
    @Input()
    set bounds(v: ISize | null) {
        if (this._$bounds.getValue() !== v) {
            this._$bounds.next(v);
        }
    }
    get bounds() { return this._$bounds.getValue(); }

    protected _$dynamic = new BehaviorSubject<boolean>(DEFAULT_DYNAMIC_SIZE);
    readonly $dynamic = this._$dynamic.asObservable();
    @Input()
    set dynamic(v: boolean) {
        if (this._$dynamic.getValue() !== v) {
            this._$dynamic.next(v);
        }
    }
    get dynamic() { return this._$dynamic.getValue(); }

    protected _$itemSize = new BehaviorSubject<number>(DEFAULT_ITEM_SIZE);
    readonly $itemSize = this._$itemSize.asObservable();
    @Input()
    set itemSize(v: number) {
        if (this._$itemSize.getValue() !== v) {
            this._$itemSize.next(v);
        }
    }
    get itemSize() { return this._$itemSize.getValue(); }

    protected _$trackBy = new BehaviorSubject<string>(TRACK_BY_PROPERTY_NAME);
    readonly $trackBy = this._$trackBy.asObservable();
    @Input()
    set trackBy(v: string) {
        if (this._$trackBy.getValue() !== v) {
            this._$trackBy.next(v);
        }
    }
    get trackBy() { return this._$trackBy.getValue(); }

    protected _$itemRenderer = new BehaviorSubject<TemplateRef<any> | null>(null);
    readonly $itemRenderer = this._$itemRenderer.asObservable();
    @Input()
    set itemRenderer(v: TemplateRef<any> | null) {
        if (this._$itemRenderer.getValue() !== v) {
            this._$itemRenderer.next(v);
        }
    }
    get itemRenderer() { return this._$itemRenderer.getValue(); }

    protected _$itemComponentClass = new BehaviorSubject<Component$1<BaseVirtualListItemComponent>>(PrerenderVirtualListItemComponent);
    readonly $itemComponentClass = this._$itemComponentClass.asObservable();
    @Input()
    set itemComponentClass(v: Component$1<BaseVirtualListItemComponent>) {
        if (this._$itemComponentClass.getValue() !== v) {
            this._$itemComponentClass.next(v);
        }
    }
    get itemComponentClass() { return this._$itemComponentClass.getValue(); }

    protected _$classes = new BehaviorSubject<{ [cName: string]: boolean }>({ prepared: true });
    readonly $classes = this._$classes.asObservable();

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

    private _activated: boolean = false;

    private _subscriptions = new Array<Subscription>();

    constructor() {
        super();

        const $enabled = this.$enabled;
        $enabled.pipe(
            takeUntil(this._$unsubscribe),
            tap(enabled => {
                if (enabled) {
                    this.activate();
                } else {
                    this.deactivate();
                }
            }),
        ).subscribe();
    }

    activate() {
        if (this._activated) {
            return;
        }
        this._activated = true;

        this._trackBox!.addEventListener(PrerenderTrackBoxEvents.RESIZE, this._onTrackBoxResizeHandler);

        this._subscriptions.push(this.$isVertical.pipe(
            takeUntil(this._$unsubscribe),
            tap(v => {
                const el = this._elementRef.nativeElement;
                toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, v ? CLASS_LIST_HORIZONTAL : CLASS_LIST_VERTICAL);
            }),
        ).subscribe());

        this._subscriptions.push(this.$bounds.pipe(
            takeUntil(this._$unsubscribe),
            filter(v => !!v),
            tap(bounds => {
                const { width, height } = bounds!;
                const el = this._elementRef.nativeElement;
                el.style.width = `${width}${PX}`;
                el.style.height = `${height}${PX}`;
            }),
        ).subscribe());

        this._subscriptions.push(combineLatest([this.$bounds, this.$items]).pipe(
            takeUntil(this._$unsubscribe),
            filter(([b, i]) => !!b && !!i),
            tap(([bounds, items]) => {
                if (this.active && !!this._trackBox) {
                    this._trackBox.reset(this._$itemComponentClass.getValue(), items, this._$bounds.getValue()!, {
                        itemRenderer: this._$itemRenderer.getValue()!,
                        dynamic: this._$dynamic.getValue(),
                        itemSize: this._$itemSize.getValue(),
                        isVertical: this._$isVertical.getValue(),
                        trackBy: this._$trackBy.getValue(),
                    });
                }
            }),
        ).subscribe());

        const $componentResize = this.$componentResize;
        this._subscriptions.push($componentResize.pipe(
            takeUntil(this._$unsubscribe),
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

    on(items: IVirtualListCollection | null = null) {
        if (!!this._trackBox) {
            this._trackBox.on();
            this._$items.next(items ?? []);
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

    override ngOnDestroy(): void {
        super.ngOnDestroy();

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