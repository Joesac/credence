import { Directive, input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[ng-template[appDataTableCell]',
})
export class DataTableCellDirective<T = unknown> {
  readonly columnKey = input.required<string>({ alias: 'appDataTableCell' });

  constructor(public readonly template: TemplateRef<{ $implicit: T }>) {}
}
