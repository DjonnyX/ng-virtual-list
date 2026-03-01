import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgVirtualListComponent } from './ng-virtual-list.component';

describe('NgVirtualListComponent', () => {
  let component: NgVirtualListComponent;
  let fixture: ComponentFixture<NgVirtualListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgVirtualListComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(NgVirtualListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
