import { Service } from '@angular/core';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import {
  Deposit,
  DepositPayload,
  DepositUpdatePayload,
  PaginatedDeposits,
} from '@interfaces/deposit.interface';
import { PaginationRequest } from '@interfaces/pagination.interface';

@Service()
export class DepositService extends IpcBridgeService {
  getDeposits(payload: PaginationRequest & { includeCancelled?: boolean; memberId?: string }): Promise<PaginatedDeposits> {
    return this.executeIPC(api => api.getDeposits(payload));
  }

  addDeposit(payload: DepositPayload): Promise<Deposit> {
    return this.executeIPC(api => api.addDeposit(payload));
  }

  updateDeposit(payload: DepositUpdatePayload): Promise<Deposit | null> {
    return this.executeIPC(api => api.updateDeposit(payload));
  }

  deleteDeposit(id: string): Promise<{ success: boolean }> {
    return this.executeIPC(api => api.deleteDeposit({ id }));
  }
}
