import { Component, input } from '@angular/core';

@Component({
  selector: 'app-disable-cover-component',
  imports: [],
  templateUrl: './disable-cover-component.html',
  styleUrl: './disable-cover-component.scss',
})
export class DisableCoverComponent {
  readonly header = input<string>('');
  readonly message = input<string>('');
}
