import { Component, signal, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-button-theme-switchter',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './button-theme-switchter.html',
  styleUrl: './button-theme-switchter.scss',
})
export class ButtonThemeSwitchter implements OnInit {
  protected readonly isDarkMode = signal(false);

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    this.setTheme(isDark);
  }

  protected toggleTheme(): void {
    this.setTheme(!this.isDarkMode());
  }

  private setTheme(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
}
