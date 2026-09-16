import { Component, inject } from "@angular/core";
import { A11yModule } from "@angular/cdk/a11y";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-statement-explanation",
  imports: [
    A11yModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: "./statement-explanation.component.html",
  styleUrl: "./statement-explanation.component.sass",
})
export class StatementExplanationComponent {
  readonly dialogRef = inject(MatDialogRef<StatementExplanationComponent>);
  public readonly data = inject<{ explanation: string }>(MAT_DIALOG_DATA);
}
