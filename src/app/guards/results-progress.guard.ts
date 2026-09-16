import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

import { VotingStateService } from "../services/voting-state.service";

/** Keeps an empty questionnaire from being interpreted as a result session. */
export const resultsProgressGuard: CanActivateFn = async () => {
  const votingState = inject(VotingStateService);
  const router = inject(Router);
  try {
    await votingState.initialize();
    return votingState.hasProgress() || router.createUrlTree(["/"]);
  } catch {
    // Let EvaluationComponent report a data-load failure instead of treating it
    // as an empty or invalid voting session.
    return true;
  }
};
