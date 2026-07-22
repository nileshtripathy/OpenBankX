import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiEnvelope, BankAccount, LinkTokenResponse } from '@/types';

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<BankAccount[]>>('/bank/accounts');
      return res.data.data;
    },
    refetchInterval: 30_000, // poll for "real-time" balance updates
  });
}

export function useCreateLinkToken() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiEnvelope<LinkTokenResponse>>('/bank/link-token');
      return res.data.data;
    },
  });
}

export function useExchangePublicToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publicToken: string) => {
      const res = await api.post<ApiEnvelope<BankAccount[]>>('/bank/exchange', {
        publicToken,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useRefreshBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const res = await api.post<ApiEnvelope<BankAccount>>(
        `/bank/accounts/${accountId}/refresh`
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useUnlinkBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      await api.delete(`/bank/accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}
