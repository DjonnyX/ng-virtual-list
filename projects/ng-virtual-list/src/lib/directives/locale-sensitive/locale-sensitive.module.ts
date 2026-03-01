import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocaleSensitiveDirective } from './locale-sensitive.directive';

@NgModule({
  declarations: [LocaleSensitiveDirective],
  exports: [LocaleSensitiveDirective],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class LocaleSensitiveModule { }
