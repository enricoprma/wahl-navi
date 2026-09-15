import { Component } from '@angular/core';
import { MatIconModule } from "@angular/material/icon";
import {MatListModule} from '@angular/material/list';
import { MatDivider } from '@angular/material/list';

@Component({
  selector: 'app-help',
  imports: [MatIconModule, MatListModule, MatDivider],
  templateUrl: './help.component.html',
  styleUrl: './help.component.sass'
})
export class HelpComponent {

}
