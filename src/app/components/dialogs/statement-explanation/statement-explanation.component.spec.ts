import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { StatementExplanationComponent } from './statement-explanation.component';

describe('StatementExplanationComponent', () => {
  let component: StatementExplanationComponent;
  let fixture: ComponentFixture<StatementExplanationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatementExplanationComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: MAT_DIALOG_DATA, useValue: { explanation: 'Details' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StatementExplanationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
