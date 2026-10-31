import { Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';

/**
 * Marker object for the datepicker *input* display format ("12 Oct, 2026").
 * CredenceDateAdapter identity-checks against this reference, so only the
 * input text is customised; every other Material format (calendar month
 * header, a11y labels, ...) keeps the default NativeDateAdapter rendering.
 * The extra properties are ignored by Intl.DateTimeFormat.
 */
export const CREDENCE_DATE_INPUT_FORMAT = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
} as Intl.DateTimeFormatOptions;

const CREDENCE_MAT_DATE_FORMATS = {
  parse: {
    dateInput: null,
    timeInput: null
  },
  display: {
    dateInput: CREDENCE_DATE_INPUT_FORMAT,
    timeInput: {
      hour: 'numeric',
      minute: 'numeric'
    },
    monthYearLabel: {
      year: 'numeric',
      month: 'short'
    },
    dateA11yLabel: {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    },
    monthYearA11yLabel: {
      year: 'numeric',
      month: 'long'
    },
    timeOptionLabel: {
      hour: 'numeric',
      minute: 'numeric'
    }
  }
};

/** Builds an "en-GB"-ordered display string: "12 Oct, 2026". */
function formatToCredenceDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'utc' // matches NativeDateAdapter's UTC-based formatting
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';
  return `${value('day')} ${value('month')}, ${value('year')}`;
}

/**
 * Date adapter that renders datepicker inputs as "12 Oct, 2026" while
 * delegating all other formatting (calendar labels, a11y text) to the
 * default NativeDateAdapter behaviour.
 */
export class CredenceDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === CREDENCE_DATE_INPUT_FORMAT) {
      if (!this.isValid(date)) {
        throw Error('CredenceDateAdapter: Cannot format invalid date.');
      }
      return formatToCredenceDateString(date);
    }
    return super.format(date, displayFormat);
  }
}

/**
 * Shared datepicker providers. Use this in place of
 * `provideNativeDateAdapter()` wherever a Material datepicker is used so the
 * "12 Oct, 2026" input format is applied consistently from one place.
 */
export function provideCredenceDateAdapter(): Provider[] {
  return [
    { provide: DateAdapter, useClass: CredenceDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CREDENCE_MAT_DATE_FORMATS },
  ];
}
