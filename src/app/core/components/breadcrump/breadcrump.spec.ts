import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Breadcrump } from './breadcrump';

describe('Breadcrump', () => {
  let component: Breadcrump;
  let fixture: ComponentFixture<Breadcrump>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Breadcrump],
    }).compileComponents();

    fixture = TestBed.createComponent(Breadcrump);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
