import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartyPositionComponent } from './party-position.component';

describe('PartyPositionComponent', () => {
  let component: PartyPositionComponent;
  let fixture: ComponentFixture<PartyPositionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartyPositionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartyPositionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
