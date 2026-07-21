import { Service } from '@angular/core';
import { DatePipe } from '@angular/common';

@Service()
export class UtilsService {
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

  normalizeDueDate(value: string | Date | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const candidate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(candidate.getTime())) {
      return null;
    }
    return candidate.toISOString();
  }
}
