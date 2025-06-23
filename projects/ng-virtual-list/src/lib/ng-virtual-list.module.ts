import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgVirtualListComponent } from './ng-virtual-list.component';
import { NgVirtualListItemComponent } from './components/ng-virtual-list-item.component';

@NgModule({
  declarations: [NgVirtualListComponent, NgVirtualListItemComponent],
  exports: [NgVirtualListComponent],
  imports: [CommonModule]
})
export class NgVirtualListModule { }
