import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundDistributionStats } from './fund-distribution-stats';

describe('FundDistributionStats', () => {
  let component: FundDistributionStats;
  let fixture: ComponentFixture<FundDistributionStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundDistributionStats],
    }).compileComponents();

    fixture = TestBed.createComponent(FundDistributionStats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
