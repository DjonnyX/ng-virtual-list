import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgScrollerComponent } from './ng-scroller.component';

describe('NgScrollerComponent', () => {
  let component: NgScrollerComponent;
  let fixture: ComponentFixture<NgScrollerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgScrollerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgScrollerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
