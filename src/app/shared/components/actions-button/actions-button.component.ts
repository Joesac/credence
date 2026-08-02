import {
  ConnectedOverlayPositionChange,
  Overlay,
  OverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Component,
  ElementRef,
  // inject,
  input,
  output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

export type ActionButtonOption = { id: string; label: string; icon?: string; disabled?: boolean; };

@Component({
  selector: 'app-actions-button',
  imports: [
    MatButtonModule, MatMenuModule, MatIconModule
  ],
  templateUrl: './actions-button.component.html',
  styleUrl: './actions-button.component.scss',
})
export class ActionsButtonComponent {

  /** Actions to be displayed in the dropdown */
  actions = input.required<ActionButtonOption[]>();

  /** State for when the action should show the loading state */
  isProcessing = input(false);

  // Outputs
  onActionSelected = output<ActionButtonOption>();

  protected _onActionSelected(event: MouseEvent, action: ActionButtonOption) {
    this.onActionSelected.emit(action);
  }
}
