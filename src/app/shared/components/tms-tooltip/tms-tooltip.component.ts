import { CdkPortalOutlet, TemplatePortal } from '@angular/cdk/portal';
import { NgClass, NgStyle } from '@angular/common';
import { Component, computed, HostBinding, inject, input, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-tms-tooltip',
  standalone: true,
  imports: [CdkPortalOutlet, NgStyle, NgClass],
  templateUrl: './tms-tooltip.component.html',
  styleUrl: './tms-tooltip.component.scss'
})
export class TmsTooltipComponent {
  contentPortal = input<TemplatePortal<any> | null>(null);
  openedPosition = input<'top' | 'bottom'>('bottom');
  backgroundColor = input<string>('');
  containerClasses = input<string>('');

  arrowColor = computed(() => {
    if (this.openedPosition() === 'bottom') {
      return { 
        'border-bottom-color': this.backgroundColor(),
        'border-bottom-width': '0.375rem',
        'bottom': '100%'
      }
    }
    
    return { 
      'border-top-color': this.backgroundColor(),
      'border-top-width': '0.375rem',
      'top': '100%'
    }
  })

  @HostBinding('class')
  get hostClass() {
    return 'tms-tooltip-container'
  }

}
