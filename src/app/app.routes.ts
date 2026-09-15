import { Routes } from '@angular/router';
import { VotingComponent } from './components/voting/voting.component';
import { EvaluationComponent } from './components/evaluation/evaluation.component';
import { StartComponent } from './components/start/start.component';
import { resultsProgressGuard } from './guards/results-progress.guard';

export const routes: Routes = [
    {
        path: '',
        component: StartComponent
    },
    {
        path: 'vote',
        component: VotingComponent
    },
    {
        path: 'results',
        component: EvaluationComponent,
        canActivate: [resultsProgressGuard]
    }
];
