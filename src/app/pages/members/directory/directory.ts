import { Component, signal, debounced, computed } from '@angular/core';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { Inputfield } from '@shared/components/inputfield/inputfield';

interface Product {
  code: string;
  name: string;
  category: string;
}

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [
    DataTable,
    Inputfield
  ],
  templateUrl: './directory.html',
  styleUrl: './directory.scss',
})
export class Directory {
  // 1. Paste in the exact design payload from your image
  protected readonly products = signal<Product[]>([
    { code: 'f230fh0g3', name: 'Bamboo Watch', category: 'Accessories' },
    { code: 'nvklal433', name: 'Black Watch', category: 'Accessories' },
    { code: 'zz21cz3c1', name: 'Blue Band', category: 'Fitness' },
    { code: '244wgerg2', name: 'Blue T-Shirt', category: 'Clothing' },
    { code: 'h456wer53', name: 'Bracelet', category: 'Accessories' }
  ]);

  // 2. Map columns explicitly to enforce strict type checking safety
  protected readonly tableConfig: ColumnDef<Product>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category' }
  ];

  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = signal<number>(2);
  protected readonly totalRecords = signal<number>(5);

  protected searchQuery = signal<string | null>('');
  protected readonly debouncedQuery = debounced(this.searchQuery, 300);

  protected readonly filteredMembers = computed(() => {
    // Note: Since debounced returns a Resource, we unwrap its state using .value()
    const query = this.debouncedQuery.value()?.toLowerCase().trim();
    
    if (!query) return this.products();

    return this.products().filter(member => 
      member.name.toLowerCase().includes(query) || 
      member.code.toLowerCase().includes(query)
    );
  });
}
