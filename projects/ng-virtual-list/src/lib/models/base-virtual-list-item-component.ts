import { TemplateRef, WritableSignal } from '@angular/core';
import { Id, ISize } from '../types';
import { IRenderVirtualListItem } from './render-item.model';

/**
 * Virtual List Item Interface
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/models/base-virtual-list-item-component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export abstract class BaseVirtualListItemComponent {
    abstract get id(): number;
    abstract data: WritableSignal<IRenderVirtualListItem | undefined>;
    abstract regular: boolean;
    abstract set regularLength(v: string)
    abstract set item(v: IRenderVirtualListItem | null | undefined);
    abstract get item(): IRenderVirtualListItem | null | undefined;
    abstract get itemId(): Id | undefined;
    abstract itemRenderer: WritableSignal<TemplateRef<any> | undefined>;
    abstract set renderer(v: TemplateRef<any> | undefined);
    abstract get element(): HTMLElement;
    protected abstract update(): void;
    public abstract getBounds(): ISize;
    public abstract show(): void;
    public abstract hide(): void;
}