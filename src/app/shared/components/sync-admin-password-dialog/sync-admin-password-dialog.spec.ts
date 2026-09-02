import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncAdminPasswordDialog } from './sync-admin-password-dialog';

describe('SyncAdminPasswordDialog', () => {
  let component: SyncAdminPasswordDialog;
  let fixture: ComponentFixture<SyncAdminPasswordDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncAdminPasswordDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncAdminPasswordDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
