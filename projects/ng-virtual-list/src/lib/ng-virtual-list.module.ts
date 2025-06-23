import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgVirtualListComponent } from './ng-virtual-list.component';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';

@NgModule({
  declarations: [NgVirtualListComponent, NgVirtualListItemComponent],
  exports: [NgVirtualListComponent],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NgVirtualListModule { }
