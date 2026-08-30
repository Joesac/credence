import { Component, inject, OnInit, signal } from '@angular/core';
import { DataTable, ColumnDef } from '@shared/components/data-table/data-table';
import { DataTableCellDirective } from '@shared/components/data-table/directive/data-table-cell-directive';
import { AuditLog } from '@interfaces/audit-log.interface';
import { AuditLogService } from '@api/services/audit-log.service';
import { ToastService } from '@core/components/toast/service/toast-service';
import { UtilsService } from '@shared/services/utils-service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [DataTable, DataTableCellDirective],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.scss',
  host: { 'class': 'w-full flex justify-center' },
})
export class AuditLogsComponent implements OnInit {
  private readonly auditLogService = inject(AuditLogService);
  private readonly toastService = inject(ToastService);
  private readonly utilsService = inject(UtilsService);

  protected readonly auditLogs = signal<AuditLog[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(15);

  protected readonly tableConfig: ColumnDef<AuditLog>[] = [
    { key: 'actorName', header: 'Actor' },
    {
      key: 'targetName',
      header: 'Target',
      formatter: (row) => row.targetName ?? '-',
    },
    { key: 'action', header: 'Action' },
    {
      key: 'details',
      header: 'Details',
      formatter: (row) => row.details ?? '-',
    },
    {
      key: 'dateCreated',
      header: 'Date',
      formatter: (row) => {
        if (!row.dateCreated) return '-';
        return `${this.utilsService.dateFormatter(row.dateCreated)} ${this.utilsService.timeFormatter(row.dateCreated).toUpperCase()}`;
      },
    },
  ];

  ngOnInit(): void {
    void this.loadAuditLogs();
  }

  private async loadAuditLogs(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.auditLogService.getAuditLogs();
      this.auditLogs.set(data);
    } catch {
      this.toastService.error({ message: 'Failed to load audit logs.' });
    } finally {
      this.isLoading.set(false);
    }
  }
}
