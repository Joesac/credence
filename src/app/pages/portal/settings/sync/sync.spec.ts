import { TestBed } from '@angular/core/testing';
import { SyncComponent } from './sync';

describe('SyncComponent', () => {
  let component: SyncComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SyncComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
