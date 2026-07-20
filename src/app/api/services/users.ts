import { Service } from '@angular/core';
import { IpcBridgeService } from '../../core/services/ipc-bridge-service';

@Service()
export class Users extends IpcBridgeService {
    getUsers(): Promise<any[]> {
        return this.executeIPC(api => api.getUsers());
    }
}