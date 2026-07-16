import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'timeFormatter',
})
export class TimeFormatterPipe implements PipeTransform {
  private readonly datePipe = new DatePipe('en-US');
  
    transform(value: string | null | undefined): string {
      if (!value) {
        return '';
      }
  
      return this.datePipe.transform(value, 'hh:mm a z', 'GMT', 'en-US') ?? '';
    }
}
