import { TestBed } from '@angular/core/testing';

import { YamlDataService } from './yaml-data.service';

describe('YamlDataService', () => {
  let service: YamlDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(YamlDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
