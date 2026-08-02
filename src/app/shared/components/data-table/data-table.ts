import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  input,
  model,
  computed,
  contentChildren
} from '@angular/core';
import { DataTableCellDirective } from "./directive/data-table-cell-directive";

export interface ColumnDef<T> {
  key: (keyof T | string) & string;
  header: string;
  formatter?: (row: T) => ColumnCellValue;
}

type ColumnCellValue = string | number | ColumnStackedValue;

type ColumnStackedValue = {
  primary: string;
  secondary?: string;
};

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  host: { 'class': 'block w-full' }
})
export class DataTable<T> {
  private readonly cellTemplates = contentChildren(DataTableCellDirective<T>);

  readonly data = input.required<T[]>();
  readonly columns = input.required<ColumnDef<T>[]>();
  readonly loading = input<boolean>(false);
  readonly loadingMessage = input<string>('Loading...');
  readonly emptyMessage = input<string>('No records available.');

  // Optional click handler function passed from consumer
  readonly onRowClick = input<((row: T) => void) | undefined>(undefined);

  readonly currentPage = model<number>(1);
  readonly pageSize = model<number>(10);

  // Optional total record count override (crucial for server-side slicing)
  readonly totalRecords = input<number | null>(null);

  protected readonly pageSizeOptions = [10, 20, 50, 100];

  // Compute the actual baseline population cap
  protected readonly totalCount = computed(() => {
    const override = this.totalRecords();
    return override !== null ? override : this.data().length;
  });

  protected readonly totalPages = computed(() => {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  });

  // Slice ONLY if the parent hasn't explicitly supplied a server-side record cap
  protected readonly paginatedData = computed(() => {
    if (this.totalRecords() !== null) {
      return this.data(); // Parent is already passing down pre-sliced chunk profiles
    }
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.data().slice(start, start + this.pageSize());
  });

  protected handleRowClick(row: T): void {
    this.onRowClick()?.(row);
  }

  protected getCellValue(row: T, column: ColumnDef<T>): ColumnCellValue | null {
    if (column.formatter) {
      return column.formatter(row);
    }
    const record = row as Record<string, unknown>;
    const value = record[column.key];
    return (value ?? null) as ColumnCellValue | null;
  }

  protected isStackedValue(value: ColumnCellValue | null): value is ColumnStackedValue {
    return typeof value === 'object' && value !== null && 'primary' in value;
  }

  protected changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(Number(select.value));
    this.currentPage.set(1);
  }

  protected getCellTemplate(key: string): DataTableCellDirective<T> | null {
    const templates = this.cellTemplates();
    return templates.find(template => template.columnKey() === key) ?? null;
  }

  // Expose Math to template cleanly
  protected readonly Math = Math;
}