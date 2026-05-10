import { Injectable, signal } from '@angular/core';

export type AppTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'animal-clinic-angular.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSignal = signal<AppTheme>(this.readInitialTheme());

  constructor() {
    this.applyThemeClass(this.themeSignal());
  }

  get theme(): AppTheme {
    return this.themeSignal();
  }

  isLightMode(): boolean {
    return this.themeSignal() === 'light';
  }

  toggleTheme(): void {
    this.setTheme(this.themeSignal() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    this.themeSignal.set(theme);
    this.applyThemeClass(theme);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }

  private readInitialTheme(): AppTheme {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'light' ? 'light' : 'dark';
  }

  private applyThemeClass(theme: AppTheme): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const body = document.body;

    root.classList.remove('theme-light', 'theme-dark');
    body.classList.remove('theme-light', 'theme-dark');

    root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
    body.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');

    root.style.colorScheme = theme;
  }
}
