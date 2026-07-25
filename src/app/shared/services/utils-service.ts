import { Service, inject, LOCALE_ID } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { formatCurrency } from '@angular/common';

@Service()
export class UtilsService {
  private readonly datePipe = new DatePipe('en-US');
  private readonly decimalPipe = new DecimalPipe('en-US');
  private readonly locale = inject(LOCALE_ID);

  dateFormatter(dateISO: string): string {
    return this.datePipe.transform(dateISO, 'dd MMM yyyy', 'GMT', 'en-GB') ?? '';
  }

  timeFormatter(dateISO: string): string {
    return this.datePipe.transform(dateISO, 'hh:mm a z', 'GMT', 'en-US') ?? '';
  }

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

  formatNumber(value: number | string): string | null {
    if (Number.isNaN(value) || !value) {
      return null;
    }

    return this.decimalPipe.transform(value, '1.0-2');
  }

  formatCurrency(
    value: number | string, 
    currencyCode: string = 'GHS',
    symbol: string = 'GH₵',
    digitsInfo: string = '1.0-2'
  ): string {  
    const numericValue = typeof value === 'string' ? Number(value) : value;
  
      if (isNaN(numericValue)) {
        return '';
      }
  
      return formatCurrency(
        numericValue,
        this.locale,
        symbol,       // Currency symbol or prefix text
        currencyCode, // ISO Currency code
        digitsInfo
      );
  }
}
