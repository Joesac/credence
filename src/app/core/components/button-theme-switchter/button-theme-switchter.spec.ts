import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonThemeSwitchter } from './button-theme-switchter';

describe('ButtonThemeSwitchter', () => {
  let component: ButtonThemeSwitchter;
  let fixture: ComponentFixture<ButtonThemeSwitchter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonThemeSwitchter],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonThemeSwitchter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
