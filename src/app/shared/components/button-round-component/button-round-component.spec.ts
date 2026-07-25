import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonRoundComponent } from './button-round-component';

describe('ButtonRoundComponent', () => {
  let component: ButtonRoundComponent;
  let fixture: ComponentFixture<ButtonRoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonRoundComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonRoundComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
