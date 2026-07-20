import { Component, input, inject } from '@angular/core';
import { Utils } from '@shared/services/utils';
import { DateFormatterPipe } from '@shared/pipes/date-formatter-pipe';

export interface LoanDetailsData {
  amountLoaned: number;
  rate: number;
  dueDate: string;
  amountPaid: number;
}

@Component({
  selector: 'app-loan-details',
  imports: [DateFormatterPipe],
  templateUrl: './loan-details.html',
  styleUrl: './loan-details.scss',
})
export class LoanDetails {
  protected readonly utilsService = inject(Utils);

  readonly details = input.required<LoanDetailsData>();
}
