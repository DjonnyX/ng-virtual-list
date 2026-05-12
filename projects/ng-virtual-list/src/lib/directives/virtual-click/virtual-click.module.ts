import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VirtualClickDirective } from './virtual-click.directive';

@NgModule({
  declarations: [VirtualClickDirective],
  exports: [VirtualClickDirective],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class VirtualClickModule { }
