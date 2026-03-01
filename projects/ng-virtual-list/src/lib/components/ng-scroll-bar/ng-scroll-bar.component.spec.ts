import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgScrollBarComponent } from './ng-scroll-bar.component';

describe('NgScrollBarComponent', () => {
  let component: NgScrollBarComponent;
  let fixture: ComponentFixture<NgScrollBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgScrollBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgScrollBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
