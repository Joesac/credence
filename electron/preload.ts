// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import {
  ELECTRON_API_BRIDGE_KEY,
  IPC_CHANNEL_ADD_DEPOSIT,
  IPC_CHANNEL_ADD_MEMBER,
  IPC_CHANNEL_ADD_USER,
  IPC_CHANNEL_ADD_WITHDRAWAL,
  IPC_CHANNEL_DELETE_DEPOSIT,
  IPC_CHANNEL_DELETE_MEMBER,
  IPC_CHANNEL_DELETE_WITHDRAWAL,
  IPC_CHANNEL_GET_DEPOSITS,
  IPC_CHANNEL_GET_MEMBER_BY_ID,
  IPC_CHANNEL_GET_MEMBER_FINANCIALS,
  IPC_CHANNEL_GET_MEMBERS,
  IPC_CHANNEL_GET_USERS,
  IPC_CHANNEL_GET_USER_BY_ID,
  IPC_CHANNEL_GET_WITHDRAWALS,
  IPC_CHANNEL_LOGIN_USER,
  IPC_CHANNEL_LOGOUT_USER,
  IPC_CHANNEL_UPDATE_DEPOSIT,
  IPC_CHANNEL_UPDATE_MEMBER,
  IPC_CHANNEL_UPDATE_USER,
  IPC_CHANNEL_UPDATE_WITHDRAWAL,
} from './constants';

contextBridge.exposeInMainWorld(ELECTRON_API_BRIDGE_KEY, {
  /**
   * Users bridge
   */
  getUsers: () => ipcRenderer.invoke(IPC_CHANNEL_GET_USERS),
  addUser: (payload: { fullname: string; username: string; password: string }) => ipcRenderer.invoke(IPC_CHANNEL_ADD_USER, payload),
  loginUser: (payload: { username: string; password: string }) => ipcRenderer.invoke(IPC_CHANNEL_LOGIN_USER, payload),
  logoutUser: (payload: { userId: string }) => ipcRenderer.invoke(IPC_CHANNEL_LOGOUT_USER, payload),
  getUserById: (payload: { id: string }) => ipcRenderer.invoke(IPC_CHANNEL_GET_USER_BY_ID, payload), 
  updateUser: (payload: { id: string; fullname?: string; username?: string; password?: string }) => ipcRenderer.invoke(IPC_CHANNEL_UPDATE_USER, payload),

  /**
   * Members bridge
   */
  getMembers: (payload: { page: number; pageSize: number; search?: string }) => ipcRenderer.invoke(IPC_CHANNEL_GET_MEMBERS, payload),
  getMemberById: (payload: { id: string }) => ipcRenderer.invoke(IPC_CHANNEL_GET_MEMBER_BY_ID, payload),
  getMemberFinancials: (payload: { memberId: string }) => ipcRenderer.invoke(IPC_CHANNEL_GET_MEMBER_FINANCIALS, payload),
  addMember: (payload: { fullname: string; telephoneNumber: string; location: string; creatorId: string }) => ipcRenderer.invoke(IPC_CHANNEL_ADD_MEMBER, payload),
  updateMember: (payload: { id: string; fullname?: string; telephoneNumber?: string; location?: string; creatorId?: string }) => ipcRenderer.invoke(IPC_CHANNEL_UPDATE_MEMBER, payload),
  deleteMember: (payload: { id: string }) => ipcRenderer.invoke(IPC_CHANNEL_DELETE_MEMBER, payload),

  /**
   * Deposits bridge
   */
  getDeposits: (options: { page: number; pageSize: number; includeCancelled?: boolean; memberId?: string }) => ipcRenderer.invoke(IPC_CHANNEL_GET_DEPOSITS, options),
  addDeposit: (payload: { memberId: string; receivedBy: string; paymentMethod: 'cash' | 'momo'; amount: number; notes?: string | null }) => ipcRenderer.invoke(IPC_CHANNEL_ADD_DEPOSIT, payload),
  updateDeposit: (payload: { id: string; memberId?: string; receivedBy?: string; paymentMethod?: 'cash' | 'momo'; amount?: number; notes?: string | null }) => ipcRenderer.invoke(IPC_CHANNEL_UPDATE_DEPOSIT, payload),
  deleteDeposit: (payload: { id: string }) => ipcRenderer.invoke(IPC_CHANNEL_DELETE_DEPOSIT, payload),

  /**
   * Withdrawals bridge
   */
  getWithdrawals: (options: { page: number; pageSize: number; includeCancelled?: boolean; memberId?: string }) => ipcRenderer.invoke(IPC_CHANNEL_GET_WITHDRAWALS, options),
  addWithdrawal: (payload: { memberId: string; issuerId: string; amount: number; notes?: string | null }) => ipcRenderer.invoke(IPC_CHANNEL_ADD_WITHDRAWAL, payload),
  updateWithdrawal: (payload: { id: string; memberId?: string; issuerId?: string; amount?: number; notes?: string | null }) => ipcRenderer.invoke(IPC_CHANNEL_UPDATE_WITHDRAWAL, payload),
  deleteWithdrawal: (payload: { id: string }) => ipcRenderer.invoke(IPC_CHANNEL_DELETE_WITHDRAWAL, payload),
});