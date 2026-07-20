import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Monthly } from './monthly';

describe('Monthly', () => {
  let component: Monthly;
  let fixture: ComponentFixture<Monthly>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Monthly],
    }).compileComponents();

    fixture = TestBed.createComponent(Monthly);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
