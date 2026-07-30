import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionWarningModal } from './session-warning-modal';

describe('SessionWarningModal', () => {
  let component: SessionWarningModal;
  let fixture: ComponentFixture<SessionWarningModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionWarningModal],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionWarningModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
