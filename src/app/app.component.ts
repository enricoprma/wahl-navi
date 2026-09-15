import { Component, inject, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSnackBarModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass',
})
export class AppComponent implements OnInit {
  private readonly matIconRegistry = inject(MatIconRegistry);
  private readonly updateService = inject(SwUpdate);
  private readonly snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.matIconRegistry.setDefaultFontSetClass('material-symbols-outlined');

    this.updateService.versionUpdates
      .pipe(
        filter(
          (event): event is VersionReadyEvent => event.type === 'VERSION_READY',
        ),
      )
      .subscribe(() => {
        const snackBarRef = this.snackBar.open(
          'A new version of Wahl-Navi is available.',
          'Reload',
        );
        snackBarRef.onAction().subscribe(() => {
          this.updateService
            .activateUpdate()
            .then(() => window.location.reload());
        });
      });
  }
}
