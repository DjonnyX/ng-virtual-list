import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XSubstrateComponent } from './x-substrate.component';

/**
 * XSubstrateModule
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/src/app/components/x-substrate/x-substrate.module.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
@NgModule({
  declarations: [XSubstrateComponent],
  exports: [XSubstrateComponent],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class XSubstrateModule { }
