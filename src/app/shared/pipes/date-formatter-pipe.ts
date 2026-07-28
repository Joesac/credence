import { Pipe, PipeTransform, inject } from '@angular/core';
import { UtilsService } from '@shared/services/utils-service';

@Pipe({
  name: 'dateFormatter',
})
export class DateFormatterPipe implements PipeTransform {
  private readonly utilsService = inject(UtilsService);

  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return this.utilsService.dateFormatter(value);
  }
}
