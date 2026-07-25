import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanSelectionDropdownComponent } from './loan-selection-dropdown-component';

describe('LoanSelectionDropdownComponent', () => {
  let component: LoanSelectionDropdownComponent;
  let fixture: ComponentFixture<LoanSelectionDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanSelectionDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanSelectionDropdownComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
