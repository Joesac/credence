import { Service } from '@angular/core';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import {
  PaginatedWithdrawals,
  Withdrawal,
  WithdrawalPayload,
  WithdrawalUpdatePayload,
} from '@interfaces/withdrawal.interface';
import { PaginationRequest } from '@interfaces/pagination.interface';

@Service()
export class WithdrawalService extends IpcBridgeService {
  getWithdrawals(payload: PaginationRequest & { includeCancelled?: boolean; memberId?: string; date?: string }): Promise<PaginatedWithdrawals> {
    return this.executeIPC(api => api.getWithdrawals(payload));
  }

  addWithdrawal(payload: WithdrawalPayload): Promise<Withdrawal> {
    return this.executeIPC(api => api.addWithdrawal(payload));
  }

  updateWithdrawal(payload: WithdrawalUpdatePayload): Promise<Withdrawal | null> {
    return this.executeIPC(api => api.updateWithdrawal(payload));
  }

  deleteWithdrawal(id: string): Promise<{ success: boolean }> {
    return this.executeIPC(api => api.deleteWithdrawal({ id }));
  }
}
