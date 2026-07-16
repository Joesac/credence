import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'dateFormatter',
})
export class DateFormatterPipe implements PipeTransform {
  private readonly datePipe = new DatePipe('en-GB');

  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return this.datePipe.transform(value, 'dd MMM yyyy', 'GMT', 'en-GB') ?? '';
  }
}
