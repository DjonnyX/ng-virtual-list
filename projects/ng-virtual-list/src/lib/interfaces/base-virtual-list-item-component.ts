import { TemplateRef } from '@angular/core';
import { Id } from '../types';
import { ISize } from './size';
import { IRenderVirtualListItem } from '../models/render-item.model';

/**
 * Virtual List Item Interface
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/interfaces/base-virtual-list-item-component.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export abstract class BaseVirtualListItemComponent {
    abstract get id(): number;
    abstract regular: boolean;
    abstract set regularLength(v: string)
    abstract set item(v: IRenderVirtualListItem | null | undefined);
    abstract get item(): IRenderVirtualListItem | null | undefined;
    abstract get itemId(): Id | undefined;
    abstract set renderer(v: TemplateRef<any> | undefined);
    abstract get element(): HTMLElement;
    public abstract getBounds(): ISize;
    public abstract show(): void;
    public abstract hide(): void;
}