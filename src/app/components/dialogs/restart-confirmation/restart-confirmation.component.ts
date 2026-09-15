import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-restart-confirmation',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './restart-confirmation.component.html',
  styleUrl: './restart-confirmation.component.sass',
})
export class RestartConfirmationComponent {
  readonly dialogRef = inject(MatDialogRef<RestartConfirmationComponent>);
}
