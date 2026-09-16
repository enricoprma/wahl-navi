import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ElectionDataService } from '../../services/election-data.service';
import { Statement } from '../../models/statement.model';
import { electionDataStub, parties, positions, statements } from '../../testing/voting-fixtures';
import { AgreementComponent } from './agreement.component';

describe('AgreementComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AgreementComponent],
      providers: [{ provide: ElectionDataService, useValue: electionDataStub() }],
    });
  });

  it('does not start an animation when data arrives after destruction', fakeAsync(() => {
    const data = TestBed.inject(ElectionDataService) as jasmine.SpyObj<ElectionDataService>;
    let resolveStatements!: (value: Statement[]) => void;
    data.getStatements.and.returnValue(new Promise(resolve => { resolveStatements = resolve; }));
    const fixture = TestBed.createComponent(AgreementComponent);
    fixture.componentRef.setInput('agreement', { party: parties[0], percent: 100 });
    fixture.componentRef.setInput('votes', []);
    fixture.detectChanges();
    fixture.destroy();
    resolveStatements(statements);
    flushMicrotasks();
    tick(1500);
    expect(fixture.componentInstance.displayPercent()).toBe(0);
    // fakeAsync also reports any timer left pending after this test.
  }));

  it('passes missing votes to the dialog without manufacturing a skip', fakeAsync(() => {
    const fixture = TestBed.createComponent(AgreementComponent);
    fixture.componentRef.setInput('agreement', { party: parties[0], percent: 0 });
    fixture.componentRef.setInput('votes', []);
    fixture.detectChanges();
    flushMicrotasks();
    const open = spyOn(fixture.debugElement.injector.get(MatDialog), 'open');
    fixture.componentInstance.openPositionDialog(positions[0], statements[0], parties[0]);
    expect(open.calls.mostRecent().args[1]?.data).toEqual({
      position: positions[0], statement: statements[0], party: parties[0], vote: undefined,
    });
  }));
});
