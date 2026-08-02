import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberSummary } from './member-summary';

describe('MemberSummary', () => {
  let component: MemberSummary;
  let fixture: ComponentFixture<MemberSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberSummary],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberSummary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
