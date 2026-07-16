import { Component, inject } from '@angular/core';
import { AppService } from '@core/services/app';

@Component({
  selector: 'app-breadcrump',
  imports: [],
  templateUrl: './breadcrump.html',
  styleUrl: './breadcrump.scss',
})
export class Breadcrump {
  protected readonly appService = inject(AppService);

  get pages() {
    return this.appService.pageRoute();
  }
}
