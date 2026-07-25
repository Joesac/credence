import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanRepaymentList } from './loan-repayment-list';

describe('LoanRepaymentList', () => {
  let component: LoanRepaymentList;
  let fixture: ComponentFixture<LoanRepaymentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanRepaymentList],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanRepaymentList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
