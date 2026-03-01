import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemClickDirective } from './item-click.directive';

@NgModule({
  declarations: [ItemClickDirective],
  exports: [ItemClickDirective],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ItemClickModule { }
