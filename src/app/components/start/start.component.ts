import { Component, inject, OnInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatToolbarModule } from "@angular/material/toolbar";
import { Router } from "@angular/router";

import { ElectionMetadata } from "../../models/election-metadata.model";
import { ElectionDataService } from "../../services/election-data.service";
import { VotingStateService } from "../../services/voting-state.service";
import { RestartConfirmationComponent } from "../dialogs/restart-confirmation/restart-confirmation.component";

@Component({
  selector: "app-start",
  imports: [MatToolbarModule, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: "./start.component.html",
  styleUrl: "./start.component.sass",
})
export class StartComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dataService = inject(ElectionDataService);
  private readonly votingState = inject(VotingStateService);
  private readonly dialog = inject(MatDialog);

  public metadata?: ElectionMetadata;
  public numberOfStatements = 0;
  public numberOfParties = 0;
  public errorMessage = "";
  public hasSavedProgress = false;

  async ngOnInit(): Promise<void> {
    try {
      const [metadata, statements, parties] = await Promise.all([
        this.dataService.getMetadata(),
        this.dataService.getStatements(),
        this.dataService.getParties(),
        this.votingState.initialize(),
      ]);

      this.metadata = metadata;
      this.numberOfStatements = statements.length;
      this.numberOfParties = parties.length;
      this.hasSavedProgress = this.votingState.hasProgress();
    } catch {
      this.errorMessage =
        "Election data could not be loaded. Please try again later.";
    }
  }

  start(): void {
    this.router.navigate(["vote"]);
  }

  continue(): void {
    this.router.navigate(["vote"]);
  }

  startOver(): void {
    if (this.hasSavedProgress) {
      this.dialog
        .open(RestartConfirmationComponent, {
          width: "min(92vw, 26rem)",
          maxWidth: "92vw",
          autoFocus: "first-tabbable",
          restoreFocus: true,
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (confirmed) this.resetAndStart();
        });
      return;
    }
    this.resetAndStart();
  }

  private resetAndStart(): void {
    this.votingState.reset();
    this.hasSavedProgress = false;
    this.router.navigate(["vote"]);
  }
}
