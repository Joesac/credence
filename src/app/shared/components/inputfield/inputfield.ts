import { Component, model, input, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

@Component({
  selector: 'app-inputfield',
  standalone: true,
  imports: [],
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

  label = input<string | null>(null);
  placeholder = input<string>('');
  type = input<'text' | 'textarea' | 'number'>('text');
  inputMode = input<'text' | 'numeric' | 'decimal'>('text');

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
