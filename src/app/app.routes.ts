import { Routes } from '@angular/router';
import { VotingComponent } from './components/voting/voting.component';
import { EvaluationComponent } from './components/evaluation/evaluation.component';
import { StartComponent } from './components/start/start.component';

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
        component: EvaluationComponent
    }
];
