import { Component } from '@angular/core';
import { Breadcrump } from '@core/components/breadcrump/breadcrump';
import { ActionCenter } from '@shared/components/action-center/action-center';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [Breadcrump, ActionCenter],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {}
