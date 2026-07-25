import { Component, input, inject } from '@angular/core';
import { UtilsService } from '@shared/services/utils-service';
import { DateFormatterPipe } from '@shared/pipes/date-formatter-pipe';
import { CurrencyFormatterPipe } from '@shared/pipes/currency-formatter-pipe';

export interface LoanDetailsData {
  amountLoaned: number;
  rate: number;
  dueDate: string;
  amountPaid: number;
  dateCreated: string;
}

@Component({
  selector: 'app-loan-details',
  imports: [
    DateFormatterPipe,
    CurrencyFormatterPipe
  ],
  templateUrl: './loan-details.html',
  styleUrl: './loan-details.scss',
})
export class LoanDetails {
  protected readonly utilsService = inject(UtilsService);

  readonly details = input.required<LoanDetailsData>();
}
