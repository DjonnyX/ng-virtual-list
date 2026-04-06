import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XSubstrateComponent } from './x-substrate.component';

describe('XSubstrateComponent', () => {
  let component: XSubstrateComponent;
  let fixture: ComponentFixture<XSubstrateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XSubstrateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(XSubstrateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
