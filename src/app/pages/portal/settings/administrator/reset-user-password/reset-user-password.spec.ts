import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetUserPassword } from './reset-user-password';

describe('ResetUserPassword', () => {
  let component: ResetUserPassword;
  let fixture: ComponentFixture<ResetUserPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetUserPassword],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetUserPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
