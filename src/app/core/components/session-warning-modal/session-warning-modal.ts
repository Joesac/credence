import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-session-warning-modal',
  imports: [],
  templateUrl: './session-warning-modal.html',
  styleUrl: './session-warning-modal.scss',
  host: {
    'class': 'block'
  }
})
export class SessionWarningModal {
  secondsRemaining = input.required<number>();
  onContinue = output<void>();
}
