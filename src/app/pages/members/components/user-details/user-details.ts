import { Component, input } from '@angular/core';
import { Member } from '../../../../interfaces/user.interface';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [],
  templateUrl: './user-details.html',
  styleUrl: './user-details.scss',
  host: { 'class': 'w-full' }
})
export class UserDetails {
  readonly user = input.required<Member>();
}
