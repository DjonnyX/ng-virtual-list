import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubstrateComponent } from './substrate.component';

@NgModule({
  declarations: [SubstrateComponent],
  exports: [SubstrateComponent],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SubstrateModule { }
