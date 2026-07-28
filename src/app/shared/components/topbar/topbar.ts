import { Component, HostListener, signal, ElementRef, inject, OnInit } from '@angular/core';
import { Breadcrump } from '@core/components/breadcrump/breadcrump';
import { ActionCenter } from '@shared/components/action-center/action-center';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, Breadcrump, ActionCenter],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar implements OnInit {
  private readonly el = inject(ElementRef);
  protected readonly isScrolled = signal(false);

  ngOnInit(): void {
    // We need to listen to the scroll event on the parent container (mat-sidenav-content)
    const scrollContainer = this.el.nativeElement.closest('mat-sidenav-content');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', (event: any) => {
        this.isScrolled.set(event.target.scrollTop > 0);
      });
    }
  }
}
