'use client';

import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useAuthStore } from '@/store/store';
import api from '@/utils/api';
import { useDashboardBilling } from '@/features/dashboard/hooks/useDashboardBilling';
import { PlanComparisonCards } from './Card';
import { SubscriptionDetails } from './SubscriptionDetails';
import {
	type BillingPageClientProps,
	type BillingStatusResponse,
	type CheckoutSessionResponse,
	type NormalizedBillingState,
	type PassStatus,
	type PlanType,
	type RazorpayCheckoutSuccessResponse,
	formatDate,
	formatNumber,
} from './types';

let razorpayScriptLoad: Promise<void> | null = null;

function ensureRazorpayCheckout(): Promise<void> {
	if (typeof window === 'undefined')
		return Promise.reject(
			new Error('Checkout is only available in a browser.'),
		);
	if (window.Razorpay) return Promise.resolve();
	if (!razorpayScriptLoad) {
		razorpayScriptLoad = new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://checkout.razorpay.com/v1/checkout.js';
			script.async = true;
			script.onload = () =>
				window.Razorpay
					? resolve()
					: reject(
							new Error('Razorpay Checkout loaded without its client API.'),
						);
			script.onerror = () =>
				reject(
					new Error(
						'Razorpay Checkout could not load. Check your connection and retry.',
					),
				);
			document.head.appendChild(script);
		});
		razorpayScriptLoad = razorpayScriptLoad.catch((error: unknown) => {
			razorpayScriptLoad = null;
			throw error;
		});
	}
	return razorpayScriptLoad;
}

const DEFAULT_MONTHLY_ALLOWANCE = 1_000;

function extractApiErrorMessage(err: unknown, fallback: string): string {
	if (axios.isAxiosError<{ message?: string; error?: string }>(err)) {
		return err.response?.data?.message || err.response?.data?.error || fallback;
	}
	if (err instanceof Error && err.message) {
		return err.message;
	}
	return fallback;
}

function normalizeBillingPayload(
	payload: BillingStatusResponse | undefined | null,
): NormalizedBillingState {
	const raw = payload?.data ?? payload ?? {};
	const planType: PlanType = raw.planType === 'pro' ? 'pro' : 'free';
	const passStatus: PassStatus =
		raw.passStatus === 'active' || raw.passStatus === 'expired'
			? raw.passStatus
			: 'inactive';

	const monthlyTokenAllowance =
		typeof raw.quota?.monthlyTokenAllowance === 'number'
			? raw.quota.monthlyTokenAllowance
			: DEFAULT_MONTHLY_ALLOWANCE;

	const tokensUsedThisMonth =
		typeof raw.quota?.tokensUsedThisMonth === 'number'
			? raw.quota.tokensUsedThisMonth
			: 0;

	return {
		planType,
		passStatus,
		passExpiryDate: raw.passExpiryDate ?? null,
		proOffer: {
			monthlyPricePaise:
				typeof raw.proOffer?.monthlyPricePaise === 'number'
					? raw.proOffer.monthlyPricePaise
					: 39_900,
			proMonthlyTokenAllowance:
				typeof raw.proOffer?.proMonthlyTokenAllowance === 'number'
					? raw.proOffer.proMonthlyTokenAllowance
					: 100_000,
		},
		quota: {
			monthlyTokenAllowance,
			tokensUsedThisMonth,
			lastMonthlyReset: raw.quota?.lastMonthlyReset ?? null,
		},
		subscription: raw.subscription ?? null,
		orders: Array.isArray(raw.orders) ? raw.orders : [],
	};
}

export function BillingPage({ className }: BillingPageClientProps) {
	const { refreshBilling } = useDashboardBilling({ autoLoad: false });
	const user = useAuthStore((s) => s.user);
	const planType = useAuthStore((s) => s.planType);
	const passStatus = useAuthStore((s) => s.passStatus);
	const monthlyTokenAllowance = useAuthStore((s) => s.monthlyTokenAllowance);

	const tokensUsedThisMonth = useAuthStore((s) => s.tokensUsedThisMonth);
	const fetchUser = useAuthStore((s) => s.fetchUser);

	const [billing, setBilling] = useState<NormalizedBillingState | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isStartingCheckout, setIsStartingCheckout] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);
	const [cancelAtCycleEnd, setCancelAtCycleEnd] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	const loadBillingStatus =
		useCallback(async (): Promise<NormalizedBillingState | null> => {
			setErrorMessage(null);
			try {
				const response = await refreshBilling();
				if (!response) throw new Error('Failed to load billing details.');
				const normalized = normalizeBillingPayload(response);
				setBilling(normalized);

				return normalized;
			} catch (err) {
				setErrorMessage(
					extractApiErrorMessage(err, 'Failed to load billing details.'),
				);
				return null;
			} finally {
				setIsLoading(false);
			}
		}, [refreshBilling]);

	const handleRefreshBilling = async () => {
		setIsRefreshing(true);
		setStatusMessage(null);
		try {
			await fetchUser();
		} catch {
			// The billing endpoint remains the source of truth for this screen.
		}
		const latest = await loadBillingStatus();
		if (latest) {
			setStatusMessage(
				latest.planType === 'pro' && latest.passStatus === 'active'
					? 'Payment confirmed. Pro is active, and your token allowance and payment history are up to date.'
					: 'Billing status and payment history are up to date. If you just paid, allow a moment for Razorpay to confirm it and refresh again.',
			);
		}
		setIsRefreshing(false);
	};

	useEffect(() => {
		void loadBillingStatus();
	}, [loadBillingStatus]);

	const handleUpgradePro = async () => {
		setErrorMessage(null);
		setStatusMessage(null);

		setIsStartingCheckout(true);
		try {
			await ensureRazorpayCheckout();
			if (!window.Razorpay)
				throw new Error('Razorpay Checkout is unavailable. Please try again.');
			const checkoutRes = await api.post<
				CheckoutSessionResponse & {
					data?: CheckoutSessionResponse;
				}
			>('/api/billing/checkout', {
				planType: 'pro',
				customerNotify: true,
			});

			const session = checkoutRes.data.data ?? checkoutRes.data;
			if (!session.keyId || !session.razorpaySubscriptionId) {
				throw new Error(
					'The billing server returned an incomplete checkout session.',
				);
			}
			const fullName = user
				? [user.firstName, user.lastName].filter(Boolean).join(' ')
				: undefined;

			const RazorpayCheckout = window.Razorpay;
			const rzp = new RazorpayCheckout({
				key: session.keyId,
				subscription_id: session.razorpaySubscriptionId,
				name: session.name ?? 'Pro Subscription',
				description:
					session.description ??
					'30-Day Monthly AI Chat Pro Pass & Token Allowance',
				prefill: {
					name: session.prefill?.name ?? fullName,
					email: session.prefill?.email ?? user?.email,
				},
				theme: {
					color: '#4f46e5',
				},
				handler: async (paymentResp: RazorpayCheckoutSuccessResponse) => {
					try {
						await api.post('/api/billing/verify', paymentResp);
						setStatusMessage(
							'Payment verified! Updating your subscription and monthly token allowance.',
						);
						await fetchUser();
						await loadBillingStatus();
					} catch (verifyErr) {
						setErrorMessage(
							extractApiErrorMessage(
								verifyErr,
								'Payment succeeded in Razorpay, but verification failed. Please refresh shortly.',
							),
						);
					}
				},
				modal: {
					ondismiss: () => {
						setIsStartingCheckout(false);
					},
				},
			});

			rzp.on('payment.failed', (resp) => {
				setErrorMessage(
					resp.error?.description ??
						'Payment failed or was declined by Razorpay.',
				);
			});

			rzp.open();
		} catch (err) {
			setErrorMessage(
				extractApiErrorMessage(err, 'Unable to initiate Pro checkout.'),
			);
		} finally {
			setIsStartingCheckout(false);
		}
	};

	const handleCancelSubscription = async () => {
		if (!billing?.subscription) return;
		setErrorMessage(null);
		setStatusMessage(null);
		setIsCancelling(true);

		try {
			await api.post('/api/billing/cancel', {
				subscriptionId: billing.subscription.id,
				cancelAtCycleEnd,
			});
			setStatusMessage(
				cancelAtCycleEnd
					? 'Subscription will cancel at the end of the current billing cycle.'
					: 'Subscription cancelled immediately.',
			);
			await fetchUser();
			await loadBillingStatus();
		} catch (err) {
			setErrorMessage(
				extractApiErrorMessage(err, 'Failed to cancel subscription.'),
			);
		} finally {
			setIsCancelling(false);
		}
	};

	if (isLoading) {
		return (
			<div className={className ?? 'mx-auto max-w-5xl space-y-6'}>
				<div className="h-36 animate-pulse rounded-xl border bg-muted/50" />
				<div className="grid gap-6 md:grid-cols-2">
					<div className="h-56 animate-pulse rounded-xl border bg-muted/50" />
					<div className="h-56 animate-pulse rounded-xl border bg-muted/50" />
				</div>
			</div>
		);
	}

	if (!billing) {
		return (
			<div className={className ?? 'mx-auto max-w-5xl'}>
				<Card className="border-destructive/40 bg-destructive/5">
					<CardHeader>
						<CardTitle className="text-base text-destructive">
							Billing Unavailable
						</CardTitle>
						<CardDescription>
							{errorMessage ?? 'Unable to load billing details right now.'}
						</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setIsLoading(true);
								void loadBillingStatus();
							}}
						>
							Retry
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	const isProActive = planType === 'pro' && passStatus === 'active';
	const isCheckoutBlocked =
		isProActive ||
		(billing.subscription !== null &&
			['created', 'authenticated', 'pending', 'paused'].includes(
				billing.subscription.status,
			));
	const effectiveAllowance =
		monthlyTokenAllowance > 0
			? monthlyTokenAllowance
			: DEFAULT_MONTHLY_ALLOWANCE;

	const remainingTokens = Math.max(0, effectiveAllowance - tokensUsedThisMonth);

	const usagePercent = Math.min(
		100,
		Math.round((tokensUsedThisMonth / effectiveAllowance) * 100),
	);

	return (
		<div className={className ?? 'mx-auto max-w-5xl space-y-6'}>
			<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Purchase Subscription
					</h2>
					<p className="text-sm text-muted-foreground">
						30-day monthly token allowance, plan management, and payment
						history.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={isRefreshing || isLoading}
					onClick={() => void handleRefreshBilling()}
					className="shrink-0"
				>
					<RefreshCw
						className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
					/>
					{isRefreshing ? 'Refreshing…' : 'Refresh billing'}
				</Button>
			</div>

			{statusMessage && (
				<div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
					{statusMessage}
				</div>
			)}

			{errorMessage && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{errorMessage}
				</div>
			)}

			{/* 30-Day Monthly Token Allowance Card */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<div>
						<CardTitle>30-Day Monthly Token Allowance</CardTitle>
						<CardDescription>
							Resets every 30 days. Remaining:{' '}
							<span className="font-medium text-foreground">
								{formatNumber(remainingTokens)}
							</span>{' '}
							tokens
						</CardDescription>
					</div>
					<span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground uppercase">
						{isProActive ? 'pro' : planType}
					</span>
				</CardHeader>

				<CardContent className="space-y-3">
					<div className="flex items-baseline justify-between text-sm">
						<span className="font-medium">
							{formatNumber(tokensUsedThisMonth)} /{' '}
							{formatNumber(effectiveAllowance)} tokens used
						</span>
						<span className="text-xs text-muted-foreground">
							{usagePercent}%
						</span>
					</div>

					<div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-all duration-300"
							style={{ width: `${usagePercent}%` }}
						/>
					</div>

					<p className="text-xs text-muted-foreground">
						Last monthly reset: {formatDate(billing.quota.lastMonthlyReset)}
					</p>
				</CardContent>
			</Card>

			{/* Free & Pro Cards */}
			<PlanComparisonCards
				proOffer={billing.proOffer}
				isStartingCheckout={isStartingCheckout}
				isCheckoutBlocked={isCheckoutBlocked}
				onUpgradePro={() => void handleUpgradePro()}
			/>

			{/* Active Subscription Details & Payment History */}
			<SubscriptionDetails
				subscription={billing.subscription}
				passExpiryDate={billing.passExpiryDate}
				orders={billing.orders}
				cancelAtCycleEnd={cancelAtCycleEnd}
				onCancelAtCycleEndChange={setCancelAtCycleEnd}
				isCancelling={isCancelling}
				onCancelSubscription={() => void handleCancelSubscription()}
			/>
		</div>
	);
}
