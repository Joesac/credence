import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Repayment } from './repayment';

describe('Repayment', () => {
  let component: Repayment;
  let fixture: ComponentFixture<Repayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Repayment],
    }).compileComponents();

    fixture = TestBed.createComponent(Repayment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
