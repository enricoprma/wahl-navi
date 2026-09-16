import { Component, inject, OnInit } from "@angular/core";
import { MatIconRegistry } from "@angular/material/icon";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.sass",
})
export class AppComponent implements OnInit {
  private readonly matIconRegistry = inject(MatIconRegistry);

  ngOnInit(): void {
    this.matIconRegistry.setDefaultFontSetClass("material-symbols-outlined");
  }
}
