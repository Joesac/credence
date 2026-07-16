import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TmsTooltipComponent } from './tms-tooltip.component';

describe('TmsTooltipComponent', () => {
  let component: TmsTooltipComponent;
  let fixture: ComponentFixture<TmsTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TmsTooltipComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TmsTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
