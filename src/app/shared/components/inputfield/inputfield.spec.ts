import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Inputfield } from './inputfield';

describe('Inputfield', () => {
  let component: Inputfield;
  let fixture: ComponentFixture<Inputfield>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inputfield],
    }).compileComponents();

    fixture = TestBed.createComponent(Inputfield);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
