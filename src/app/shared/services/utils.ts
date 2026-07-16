import { Service } from '@angular/core';
import { DatePipe } from '@angular/common';

@Service()
export class Utils {
  private readonly datePipe = new DatePipe('en-US');

  dateFormatter(dateISO: string): string {
    return this.datePipe.transform(dateISO, 'dd MMM yyyy', 'GMT', 'en-GB') ?? '';
  }

  timeFormatter(dateISO: string): string {
    return this.datePipe.transform(dateISO, 'hh:mm a z', 'GMT', 'en-US') ?? '';
  }

  currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'GHS'
  });
}
