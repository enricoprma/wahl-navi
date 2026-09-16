import { Component, inject } from "@angular/core";
import { A11yModule } from "@angular/cdk/a11y";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";

@Component({
  selector: "app-restart-confirmation",
  imports: [A11yModule, MatButtonModule, MatDialogModule],
  templateUrl: "./restart-confirmation.component.html",
  styleUrl: "./restart-confirmation.component.sass",
})
export class RestartConfirmationComponent {
  readonly dialogRef = inject(MatDialogRef<RestartConfirmationComponent>);
}
