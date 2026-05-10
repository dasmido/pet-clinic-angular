import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(readonly themeService: ThemeService) {
    this.themeService.setTheme(this.themeService.theme);
  }
}
