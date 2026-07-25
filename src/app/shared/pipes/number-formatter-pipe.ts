import { Pipe, PipeTransform, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Pipe({
  name: 'numberFormatter',
})
export class NumberFormatterPipe implements PipeTransform {
  private readonly decimalPipe = new DecimalPipe('en-US');

  transform(value: number | string | null | undefined): string | null {
    if (!value || Number.isNaN(value)) {
      return null;
    }

    return this.decimalPipe.transform(value, '1.0-2');
  }
}
