'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BillingStatusResponse } from '@/components/dashboard/types';
import { useAuthStore } from '@/store/store';
import api from '@/utils/api';

export function useDashboardBilling({ autoLoad = true }: { autoLoad?: boolean } = {}) {
	const setSubscriptionDetails = useAuthStore((state) => state.setSubscriptionDetails);
	const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refreshBilling = useCallback(async () => {
		setError(null);
		try {
			const response = await api.get<BillingStatusResponse>('/api/billing/status');
			const status = response.data.data ?? response.data;
			setBillingStatus(status);
			if (status.planType && status.passStatus) {
				setSubscriptionDetails({
					planType: status.planType,
					passStatus: status.passStatus,
					passExpiryDate: status.passExpiryDate,
					monthlyTokenAllowance: status.quota?.monthlyTokenAllowance,
					tokensUsedThisMonth: status.quota?.tokensUsedThisMonth,
				});
			}
			return status;
		} catch (requestError) {
			const message =
				requestError instanceof Error
					? requestError.message
					: 'Failed to load billing details.';
			setError(message);
			return null;
		} finally {
			setIsLoading(false);
		}
	}, [setSubscriptionDetails]);

	useEffect(() => {
		if (autoLoad) void refreshBilling();
	}, [autoLoad, refreshBilling]);

	return { billingStatus, isLoading, error, refreshBilling };
}
