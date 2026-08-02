import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisableCoverComponent } from './disable-cover-component';

describe('DisableCoverComponent', () => {
  let component: DisableCoverComponent;
  let fixture: ComponentFixture<DisableCoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisableCoverComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DisableCoverComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
