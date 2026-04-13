import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgVirtualListItemComponent } from './ng-virtual-list-item.component';
import { ItemClickModule } from '../../directives';

@NgModule({
  declarations: [NgVirtualListItemComponent],
  exports: [NgVirtualListItemComponent],
  imports: [CommonModule, ItemClickModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NgVirtualListItemModule { }
