import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';

import { ElectionMetadata } from '../../models/election-metadata.model';
import { YamlDataService } from '../../services/yaml-data.service';

@Component({
  selector: 'app-start',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './start.component.html',
  styleUrl: './start.component.sass',
})
export class StartComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dataService = inject(YamlDataService);

  public metadata?: ElectionMetadata;
  public numberOfStatements = 0;
  public numberOfParties = 0;

  async ngOnInit(): Promise<void> {
    const [metadata, statements, parties] = await Promise.all([
      this.dataService.getMetadata(),
      this.dataService.getStatements(),
      this.dataService.getParties(),
    ]);

    this.metadata = metadata;
    this.numberOfStatements = statements.length;
    this.numberOfParties = parties.length;
  }

  start(): void {
    this.router.navigate(['vote']);
  }
}
