import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatementExplanationComponent } from './statement-explanation.component';

describe('StatementExplanationComponent', () => {
  let component: StatementExplanationComponent;
  let fixture: ComponentFixture<StatementExplanationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatementExplanationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatementExplanationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
