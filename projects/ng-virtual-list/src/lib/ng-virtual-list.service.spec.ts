import { TestBed } from '@angular/core/testing';

import { NgVirtualListService } from './ng-virtual-list.service';

describe('NgVirtualListService', () => {
  let service: NgVirtualListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgVirtualListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
