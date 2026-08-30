import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { ResetUserPassword } from './reset-user-password/reset-user-password';
import { ResetSyncPassword } from './reset-sync-password/reset-sync-password';

@Component({
  selector: 'app-administrator',
  standalone: true,
  imports: [MatTabsModule, ResetUserPassword, ResetSyncPassword],
  templateUrl: './administrator.html',
  styleUrl: './administrator.scss',
})
export class Administrator {}
