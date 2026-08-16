import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CloudUsersService } from './users';

describe('CloudUsersService', () => {
  let service: CloudUsersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(CloudUsersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
