import { Component, ElementRef, model, input, output, signal, inject, ViewChild } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';

export interface DropdownItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [JsonPipe, OverlayModule],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
  host: {
    'class': 'w-full flex flex-col relative',
    '(focusin)': 'openDropdown()',
    '(focusout)': 'handleFocusOut($event)'
  }
})
export class Dropdown implements FormValueControl<string | null> {
  readonly value = model<string | null>(null);
  readonly errors = input<any>();
  readonly touched = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly touch = output<void>();
  readonly collection = input<DropdownItem[] | null>([
    { label: "Item 1", value: "item 1" },
    { label: "Item 2", value: "item 2" },
  ]);

  protected readonly _label = signal<string | null>(null);
  protected readonly isDropdownOpen = signal(false);
  protected readonly panelWidth = signal<number>(0);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  @ViewChild(CdkConnectedOverlay) private overlayDir?: CdkConnectedOverlay;
  @ViewChild(CdkOverlayOrigin, { read: ElementRef }) private originRef?: ElementRef<HTMLElement>;
  
  protected readonly overlayPositions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: 2
    },
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetY: -2
    }
  ];
  
  label = input<string>('');
  errorMessage = input<string | null>(null);
  placeholder = input<string>('');
  type = input<'text'>('text');

  protected onSelect(item: DropdownItem) {
    this.value.set(item.value);
    this._label.set(item.label);
    this.isDropdownOpen.set(false);
    this.touch.emit();
  }

  protected openDropdown(): void {
    this.syncPanelWidth();
    this.isDropdownOpen.set(true);
  }

  protected handleFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    const host = this.hostRef.nativeElement;
    const overlayEl = this.overlayDir?.overlayRef?.overlayElement ?? null;

    if (next && (host.contains(next) || overlayEl?.contains(next))) {
      return;
    }

    this.closeDropdown();
  }

  protected closeDropdown(): void {
    if (!this.isDropdownOpen()) {
      return;
    }

    this.isDropdownOpen.set(false);
    this.touch.emit();
  }

  private syncPanelWidth(): void {
    const originEl = this.originRef?.nativeElement ?? this.hostRef.nativeElement;
    const width = originEl.getBoundingClientRect().width;
    this.panelWidth.set(width);
  }
}
