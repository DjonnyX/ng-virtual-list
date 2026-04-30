import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgVirtualListItemComponent } from '../../../ng-list-item/ng-virtual-list-item.component';
import {
    DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, PX, SIZE_100_PERSENT, SIZE_AUTO,
    VISIBILITY_HIDDEN, VISIBILITY_VISIBLE,
} from '../../../../const';
import { ID, POSITION, POSITION_ZERO } from '../../../ng-list-item/const';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-prerender-container/components/ng-prerender-list-item.component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
    selector: 'ng-prerender-virtual-list-item',
    templateUrl: '../../../ng-list-item/ng-virtual-list-item.component.html',
    styleUrls: ['../../../ng-list-item/ng-virtual-list-item.component.scss', './ng-prerender-list-item.component.scss'],
    host: {
        'class': 'ngvl__item',
        'role': 'listitem',
    },
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgPrerenderVirtualListItemComponent extends NgVirtualListItemComponent {
    protected override update() {
        const data = this._data, regular = this.regular, length = this._regularLength, el = this._elementRef.nativeElement,
        itemElement = this._item()?.nativeElement, containerElement = this._container()?.nativeElement;
        if (!!data && !!el && !!itemElement && !!containerElement) {
            const styles = el.style, itemElementStyles = itemElement.style;
            el.setAttribute(ID, `${data.id}`);
            styles.zIndex = data.config.zIndex;
            if (regular) {
                el.setAttribute(POSITION, POSITION_ZERO);
            } else {
                el.setAttribute(POSITION, `${data.config.isVertical ? data.measures.y : data.measures.x}`);
            }
            if (data.config.divides > 1) {
                styles.height = data.config.isVertical ? `${data.measures.row.size}${PX}` : `${data.measures.height}${PX}`;
                styles.width = data.config.isVertical ? `${data.measures.width}${PX}` : `${data.measures.row.size}${PX}`;
                itemElementStyles.minWidth = styles.minWidth = `${data.measures.minWidth}${PX}`;
                itemElementStyles.maxWidth = styles.maxWidth = `${data.measures.maxWidth}${PX}`;
                itemElementStyles.minHeight = styles.minHeight = `${data.measures.minHeight}${PX}`;
                itemElementStyles.maxHeight = styles.maxHeight = `${data.measures.maxHeight}${PX}`;
        
                itemElementStyles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : `${data.measures.height}${PX}`;
                itemElementStyles.width = data.config.isVertical ? regular ? length : `${data.measures.width}${PX}` : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
              } else {
                styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : `${data.measures.height}${PX}`;
                styles.width = data.config.isVertical ? regular ? length : `${data.measures.width}${PX}` : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
                styles.minWidth = `${data.measures.minWidth}${PX}`;
                styles.maxWidth = `${data.measures.maxWidth}${PX}`;
                styles.minHeight = `${data.measures.minHeight}${PX}`;
                styles.maxHeight = `${data.measures.maxHeight}${PX}`;
              }
            // styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : SIZE_100_PERSENT;
            // styles.width = data.config.isVertical ? regular ? length : SIZE_100_PERSENT : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;
        } else {
            el.removeAttribute(ID);
        }
    }

    override show() {
        const el = this._elementRef.nativeElement as HTMLElement,
            styles = el.style;
        styles.zIndex = this._data?.config?.zIndex ?? DEFAULT_ZINDEX;
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
    }

    override hide() {
        const el = this._elementRef.nativeElement,
            styles = el.style;
        styles.zIndex = HIDDEN_ZINDEX;
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
    }
}