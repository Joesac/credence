// src/decl.d.ts
import { Member, MemberFinancialSummary } from '@interfaces/member.interface';
import { User } from '@interfaces/user.interface';
import { PaginatedResponse, PaginationRequest } from '@interfaces/pagination.interface';
import {
  Deposit,
  DepositPayload,
  DepositUpdatePayload,
  PaginatedDeposits,
} from '@interfaces/deposit.interface';
import {
  PaginatedWithdrawals,
  Withdrawal,
  WithdrawalPayload,
  WithdrawalUpdatePayload,
} from '@interfaces/withdrawal.interface';
import {
  Loan,
  LoanPayload,
  LoanUpdatePayload,
  PaginatedLoans,
} from '@interfaces/loan.interface';

export interface ElectronAPI {
  getUsers: () => Promise<User[]>;
  addUser: (payload: { fullname: string; username: string; password: string }) => Promise<User>;
  getUserById: (payload: { id: string }) => Promise<User | null>;
  loginUser: (payload: { username: string; password: string }) => Promise<User>;
  logoutUser: (payload: { userId: string }) => Promise<{ success: boolean }>;
  updateUser: (payload: { id: string; fullname?: string; username?: string; password?: string }) => Promise<User>;
  getMembers: (payload: PaginationRequest) => Promise<PaginatedResponse<Member>>;
  getMemberById: (payload: { id: string }) => Promise<any>;
  addMember: (payload: { fullname: string; telephoneNumber: string; location: string; creatorId: string }) => Promise<any>;
  updateMember: (payload: { id: string; fullname?: string; telephoneNumber?: string; location?: string; creatorId?: string }) => Promise<any>;
  deleteMember: (payload: { id: string }) => Promise<{ success: boolean }>;
  getMemberFinancials: (payload: { memberId: string }) => Promise<MemberFinancialSummary>;
  getDeposits: (payload: PaginationRequest & { includeCancelled?: boolean; memberId?: string }) => Promise<PaginatedDeposits>;
  addDeposit: (payload: DepositPayload) => Promise<Deposit>;
  updateDeposit: (payload: DepositUpdatePayload) => Promise<Deposit | null>;
  deleteDeposit: (payload: { id: string }) => Promise<{ success: boolean }>;
  getWithdrawals: (payload: PaginationRequest & { includeCancelled?: boolean; memberId?: string }) => Promise<PaginatedWithdrawals>;
  addWithdrawal: (payload: WithdrawalPayload) => Promise<Withdrawal>;
  updateWithdrawal: (payload: WithdrawalUpdatePayload) => Promise<Withdrawal | null>;
  deleteWithdrawal: (payload: { id: string }) => Promise<{ success: boolean }>;
  getLoans: (payload: PaginationRequest & { includeCancelled?: boolean; memberId?: string; issuerId?: string }) => Promise<PaginatedLoans>;
  getMemberLoans: (payload: PaginationRequest & { memberId: string; includeCancelled?: boolean }) => Promise<PaginatedLoans>;
  addLoan: (payload: LoanPayload) => Promise<Loan>;
  updateLoan: (payload: LoanUpdatePayload) => Promise<Loan | null>;
  deleteLoan: (payload: { id: string }) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}