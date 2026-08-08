import { Service } from '@angular/core';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import {
  CreateFundDistributionPayload,
  FundDistributionSummary,
  GlobalFundDistributionStats,
} from '@interfaces/fund-distribution.interface';

@Service()
export class FundDistributionService extends IpcBridgeService {
  getGlobalStats(): Promise<GlobalFundDistributionStats> {
    return this.executeIPC(api => api.getGlobalFundDistributionStats());
  }

  getMemberStats(memberId: string): Promise<FundDistributionSummary> {
    return this.executeIPC(api => api.getFundDistributionStats({ memberId }));
  }

  createFundDistribution(payload: CreateFundDistributionPayload): Promise<{ success: boolean }> {
    return this.executeIPC(api => api.createFundDistribution(payload));
  }
}
