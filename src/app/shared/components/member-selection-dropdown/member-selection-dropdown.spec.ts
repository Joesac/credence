import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberSelectionDropdown } from './member-selection-dropdown';

describe('MemberSelectionDropdown', () => {
  let component: MemberSelectionDropdown;
  let fixture: ComponentFixture<MemberSelectionDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberSelectionDropdown],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberSelectionDropdown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
