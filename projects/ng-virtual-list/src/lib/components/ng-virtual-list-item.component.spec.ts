import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgVirtualListItemComponent } from './ng-virtual-list-item.component';

describe('NgVirtualListItemComponent', () => {
  let component: NgVirtualListItemComponent;
  let fixture: ComponentFixture<NgVirtualListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgVirtualListItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgVirtualListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
