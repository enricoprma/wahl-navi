import { Component, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDivider } from '@angular/material/list';

@Component({
  selector: 'app-help',
  imports: [A11yModule, MatButtonModule, MatIconModule, MatListModule, MatDivider],
  templateUrl: './help.component.html',
  styleUrl: './help.component.sass'
})
export class HelpComponent {
  private readonly bottomSheetRef = inject(MatBottomSheetRef<HelpComponent>);

  dismiss(): void {
    this.bottomSheetRef.dismiss();
  }
}
