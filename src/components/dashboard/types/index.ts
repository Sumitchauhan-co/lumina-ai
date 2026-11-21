export type PlanType = 'free' | 'pro';
export type PassStatus = 'inactive' | 'active' | 'expired';

export type SubscriptionStatus =
	| 'created'
	| 'authenticated'
	| 'active'
	| 'pending'
	| 'halted'
	| 'cancelled'
	| 'completed'
	| 'paused'
	| 'expired';

export type PaymentOrderStatus = 'created' | 'paid' | 'failed' | 'refunded';

export interface MonthlyQuotaSummary {
	monthlyTokenAllowance: number;
	tokensUsedThisMonth: number;
	lastMonthlyReset: string | null;
}

export interface ActiveSubscription {
	id: string;
	razorpaySubscriptionId: string | null;
	razorpayPlanId: string;
	planType: PlanType;
	status: SubscriptionStatus;
	monthlyTokenAllowance: number;
	currentPeriodStart: string | null;
	currentPeriodEnd: string | null;
	createdAt: string;
}

export interface PaymentOrderItem {
	id: string;
	razorpayOrderId: string;
	razorpayPaymentId: string | null;
	amountPaise: number;
	currency: string;
	status: PaymentOrderStatus;
	createdAt: string;
}

export interface BillingStatusResponse {
	planType?: PlanType;
	passStatus?: PassStatus;
	passExpiryDate?: string | null;
	proOffer?: {
		monthlyPricePaise?: number;
		proMonthlyTokenAllowance?: number;
	} | null;
	quota?: Partial<MonthlyQuotaSummary> | null;
	subscription?: ActiveSubscription | null;
	orders?: PaymentOrderItem[] | null;
	data?: BillingStatusResponse;
}

export interface NormalizedBillingState {
	planType: PlanType;
	passStatus: PassStatus;
	passExpiryDate: string | null;
	proOffer: {
		monthlyPricePaise: number;
		proMonthlyTokenAllowance: number;
	};
	quota: MonthlyQuotaSummary;
	subscription: ActiveSubscription | null;
	orders: PaymentOrderItem[];
}

export interface CheckoutSessionResponse {
	subscriptionId: string;
	razorpaySubscriptionId: string;
	keyId: string;
	name?: string;
	description?: string;
	prefill?: {
		name?: string;
		email?: string;
	};
}

export interface RazorpayCheckoutSuccessResponse {
	razorpay_payment_id: string;
	razorpay_subscription_id: string;
	razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
	key: string;
	subscription_id: string;
	name: string;
	description?: string;
	prefill?: {
		name?: string;
		email?: string;
	};
	theme?: {
		color?: string;
	};
	handler: (response: RazorpayCheckoutSuccessResponse) => void | Promise<void>;
	modal?: {
		ondismiss?: () => void;
	};
}

export interface RazorpayCheckoutInstance {
	open: () => void;
	on: (
		event: string,
		callback: (resp: { error?: { description?: string } }) => void,
	) => void;
}

declare global {
	interface Window {
		Razorpay?: new (
			options: RazorpayCheckoutOptions,
		) => RazorpayCheckoutInstance;
	}
}

export interface BillingPageClientProps {
	className?: string;
}

export function formatNumber(value: number): string {
	return (Number.isFinite(value) ? value : 0).toLocaleString('en-US');
}

export function formatDate(iso?: string | null): string {
	if (!iso) return '—';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export function formatAmount(amountPaise: number, currency: string): string {
	const major = (amountPaise ?? 0) / 100;
	try {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: currency || 'INR',
			maximumFractionDigits: 2,
		}).format(major);
	} catch {
		return `${currency || 'INR'} ${major.toFixed(2)}`;
	}
}
