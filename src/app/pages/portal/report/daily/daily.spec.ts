import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Daily } from './daily';

describe('Daily', () => {
  let component: Daily;
  let fixture: ComponentFixture<Daily>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Daily],
    }).compileComponents();

    fixture = TestBed.createComponent(Daily);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
