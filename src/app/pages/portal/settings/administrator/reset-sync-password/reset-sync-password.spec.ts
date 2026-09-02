import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetSyncPassword } from './reset-sync-password';

describe('ResetSyncPassword', () => {
  let component: ResetSyncPassword;
  let fixture: ComponentFixture<ResetSyncPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetSyncPassword],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetSyncPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
