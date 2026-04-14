import { TemplateRef } from '@angular/core';
import { Id } from '../types';
import { ISize } from './size';
import { IRenderVirtualListItem } from '../models/render-item.model';

/**
 * IBaseVirtualListItemComponent
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/base-virtual-list-item-component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IBaseVirtualListItemComponent {
    get id(): number;
    regular: boolean;
    set regularLength(v: string)
    set item(v: IRenderVirtualListItem | null | undefined);
    get item(): IRenderVirtualListItem | null | undefined;
    get itemId(): Id | undefined;
    set renderer(v: TemplateRef<any> | undefined);
    get element(): HTMLElement;
    getBounds(): ISize;
    show(): void;
    hide(): void;
}