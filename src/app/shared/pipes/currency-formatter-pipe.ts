import { Pipe, PipeTransform, inject, LOCALE_ID } from '@angular/core';
import { formatCurrency } from '@angular/common';

@Pipe({
  name: 'currencyFormatter',
})
export class CurrencyFormatterPipe implements PipeTransform {
  private locale = inject(LOCALE_ID);

 transform(
    value: number | string | null | undefined,
    currencyCode: string = 'GHS',
    symbol: string = 'GH₵',
    digitsInfo: string = '1.0-2'
  ): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

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
