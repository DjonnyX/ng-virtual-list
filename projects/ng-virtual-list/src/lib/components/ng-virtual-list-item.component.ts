import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, TemplateRef } from '@angular/core';
import { IRenderVirtualListItem } from '../models/render-item.model';
import { Id, ISize } from '../types';
import {
  DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, PART_DEFAULT_ITEM, PART_ITEM_EVEN, PART_ITEM_ODD, PART_ITEM_SELECTED, PART_ITEM_SNAPPED, POSITION_ABSOLUTE, POSITION_STICKY, PX, SIZE_100_PERSENT,
  SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN, VISIBILITY_VISIBLE, ZEROS_TRANSLATE_3D,
} from '../const';
import { BaseVirtualListItemComponent } from '../models/base-virtual-list-item-component';
import { NgVirtualListService } from '../ng-virtual-list.service';
import { map, takeUntil, tap } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { IRenderVirtualListItemConfig } from '../models/render-item-config.model';
import { MethodsForSelectingTypes } from '../enums/method-for-selecting-types';

const ATTR_AREA_SELECTED = 'area-selected';

/**
 * Virtual list item component
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/components/ng-virtual-list-item.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-list-item',
  templateUrl: './ng-virtual-list-item.component.html',
  styleUrls: ['./ng-virtual-list-item.component.scss'],
  host: {
    'class': 'ngvl__item',
    'role': 'listitem',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualListItemComponent extends BaseVirtualListItemComponent {
  protected _$unsubscribe = new Subject<void>();

  private _id!: number;
  get id() {
    return this._id;
  }

  private _part = PART_DEFAULT_ITEM;
  get part() { return this._part; }

  private _isSelected: boolean = false;
  config = new BehaviorSubject<IRenderVirtualListItemConfig & { selected: boolean }>({} as any);

  regular: boolean = false;

  data: IRenderVirtualListItem | undefined;

  private _$data = new BehaviorSubject<IRenderVirtualListItem | undefined>(this.data);
  private $data = this._$data.asObservable();

  set item(v: IRenderVirtualListItem | undefined) {
    if (this.data === v) {
      return;
    }

    this.data = v;

    this.updatePartStr(v, this._isSelected);

    this.updateConfig(v);

    this.update();

    this._$data.next(v);

    this._cdr.detectChanges();
  }

  private _regularLength: string = SIZE_100_PERSENT;
  set regularLength(v: string) {
    if (this._regularLength === v) {
      return;
    }

    this._regularLength = v;

    this.update();

    this._cdr.detectChanges();
  }

  get item() {
    return this.data;
  }

  get itemId() {
    return this.data?.id;
  }

  itemRenderer: TemplateRef<any> | undefined;

  set renderer(v: TemplateRef<any> | undefined) {
    if (this.itemRenderer === v) {
      return;
    }

    this.itemRenderer = v;

    this._cdr.markForCheck();
  }

  get element() {
    return this._elementRef.nativeElement;
  }

  constructor(private _cdr: ChangeDetectorRef, private _elementRef: ElementRef<HTMLElement>, private _service: NgVirtualListService) {
    super();
    this._id = this._service.generateComponentId();

    const $data = this.$data;

    combineLatest([$data, this._service.$methodOfSelecting, this._service.$selectedIds]).pipe(
      takeUntil(this._$unsubscribe),
      map(([, m, ids]) => ({ method: m, ids })),
      tap(({ method, ids }) => {
        switch (method) {
          case MethodsForSelectingTypes.SELECT: {
            const id = ids as Id | undefined, isSelected = id === this.itemId;
            this._elementRef.nativeElement.setAttribute(ATTR_AREA_SELECTED, String(isSelected));
            this._isSelected = isSelected;
            break;
          }
          case MethodsForSelectingTypes.MULTI_SELECT: {
            const actualIds = ids as Array<Id>, isSelected = this.itemId !== undefined && actualIds && actualIds.includes(this.itemId);
            this._elementRef.nativeElement.setAttribute(ATTR_AREA_SELECTED, String(isSelected));
            this._isSelected = isSelected;
            break;
          }
          case MethodsForSelectingTypes.NONE:
          default: {
            this._elementRef.nativeElement.removeAttribute(ATTR_AREA_SELECTED);
            this._isSelected = false;
            break;
          }
        }

        this.updatePartStr(this.data, this._isSelected);

        this.updateConfig(this.data);
      }),
    ).subscribe();
  }

  private updateConfig(v: IRenderVirtualListItem<any> | undefined) {
    this.config.next({ ...v?.config || {}, selected: this._isSelected } as any);
  }

  private update() {
    const data = this.data, regular = this.regular, length = this._regularLength;
    if (data) {
      const styles = this._elementRef.nativeElement.style;
      styles.zIndex = data.config.zIndex;
      if (data.config.snapped) {
        styles.transform = data.config.sticky === 1 ? ZEROS_TRANSLATE_3D : `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;;
        if (!data.config.isSnappingMethodAdvanced) {
          styles.position = POSITION_STICKY;
        }
      } else {
        styles.position = POSITION_ABSOLUTE;
        if (regular) {
          styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.delta}${PX}, ${data.config.isVertical ? data.measures.delta : 0}${PX} , 0)`;
        } else {
          styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;
        }
      }
      styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : SIZE_100_PERSENT;
      styles.width = data.config.isVertical ? regular ? length : SIZE_100_PERSENT : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
    }

    this._cdr.markForCheck();
  }

  private updatePartStr(v: IRenderVirtualListItem | undefined, isSelected: boolean) {
    let odd = false;
    if (v?.index !== undefined) {
      odd = v.index % 2 === 0;
    }

    let part = PART_DEFAULT_ITEM;
    part += odd ? PART_ITEM_ODD : PART_ITEM_EVEN;
    if (v ? v.config.snapped : false) {
      part += PART_ITEM_SNAPPED;
    }
    if (isSelected) {
      part += PART_ITEM_SELECTED;
    }
    this._part = part;
  }

  getBounds(): ISize {
    const el: HTMLElement = this._elementRef.nativeElement,
      { width, height } = el.getBoundingClientRect();
    return { width, height };
  }

  show() {
    const styles = this._elementRef.nativeElement.style;
    if (this.regular) {
      if (styles.display === DISPLAY_BLOCK) {
        return;
      }

      styles.display = DISPLAY_BLOCK;
    } else {
      if (styles.visibility === VISIBILITY_VISIBLE) {
        return;
      }

      styles.visibility = VISIBILITY_VISIBLE;
    }
    styles.zIndex = this.data?.config?.zIndex ?? DEFAULT_ZINDEX;
  }

  hide() {
    const styles = this._elementRef.nativeElement.style;
    if (this.regular) {
      if (styles.display === DISPLAY_NONE) {
        return;
      }

      styles.display = DISPLAY_NONE;
    } else {
      if (styles.visibility === VISIBILITY_HIDDEN) {
        return;
      }

      styles.visibility = VISIBILITY_HIDDEN;
    }
    styles.position = POSITION_ABSOLUTE;
    styles.transform = ZEROS_TRANSLATE_3D;
    styles.zIndex = HIDDEN_ZINDEX;
  }

  onClickHandler() {
    this._service.itemClick(this.data);
  }

  ngOnDestroy(): void {
    if (this._$unsubscribe) {
      this._$unsubscribe.next();
      this._$unsubscribe.complete();
    }
  }
}

