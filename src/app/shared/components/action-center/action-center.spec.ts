import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionCenter } from './action-center';

describe('ActionCenter', () => {
  let component: ActionCenter;
  let fixture: ComponentFixture<ActionCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionCenter],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionCenter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
