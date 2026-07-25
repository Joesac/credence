import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-settings',
  imports: [RouterModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  host: { 'class': 'w-full flex justify-center' }
})
export class Settings {}
