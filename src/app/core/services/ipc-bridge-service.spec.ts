import { TestBed } from '@angular/core/testing';

import { IpcBridgeService } from './ipc-bridge-service';

describe('IpcBridgeService', () => {
  let service: IpcBridgeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IpcBridgeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
