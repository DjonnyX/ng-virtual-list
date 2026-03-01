import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubstrateComponent } from './substrate.component';

describe('SubstrateComponent', () => {
  let component: SubstrateComponent;
  let fixture: ComponentFixture<SubstrateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubstrateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubstrateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
