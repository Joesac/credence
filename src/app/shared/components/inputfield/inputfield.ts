import { Component, model, input, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-inputfield',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './inputfield.html',
  styleUrl: './inputfield.scss',
  host: {
    'class': 'w-full flex flex-col'
  }
})
export class Inputfield implements FormValueControl<string | number | null> {
  readonly value = model<string | number | null>(null);
  readonly errors = input<any>();
  readonly touched = input<boolean>(false);
  readonly touch = output<void>();
  
  readonly hint = input<string>('');
  readonly label = input<string | null>(null);
  readonly placeholder = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly type = input<'text' | 'textarea' | 'password'>('text');
  readonly inputMode = input<'text' | 'numeric' | 'decimal'>('text');
  readonly icon = input<string | null>(null);
  readonly iconClick = output<void>();

  protected onKeydown(event: KeyboardEvent) {
    const mode = this.inputMode();
    if (mode !== 'numeric' && mode !== 'decimal') return;

    const allowedKeys = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight'];
    if (allowedKeys.includes(event.key)) return;

    if (/^[0-9]$/.test(event.key)) return;

    if (mode === 'decimal' && event.key === '.') {
      const target = event.target as HTMLInputElement | null;
      if (!target?.value.includes('.')) return; // allow first decimal point
    }

    event.preventDefault();
  }
}
