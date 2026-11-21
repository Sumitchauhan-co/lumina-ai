import axios, { type Method } from 'axios';
import ApiError from '@/utils/apiError';

export interface RazorpayConfig {
	keyId: string;
	keySecret: string;
	webhookSecret: string;
	planId: string;
	monthlyPricePaise: number;
	proMonthlyTokenAllowance: number;
}

export interface RazorpayOffer {
	monthlyPricePaise: number;
	proMonthlyTokenAllowance: number;
}

export interface RazorpaySubscriptionResponse {
	id: string;
	status?: string;
	short_url?: string;
}

export interface RazorpayPlanResponse {
	period?: string;
	interval?: number;
	item?: { amount?: number; currency?: string; name?: string };
}

export interface RazorpayPaymentResponse {
	id: string;
	order_id?: string | null;
	subscription_id?: string | null;
	amount: number;
	currency: string;
	status: string;
}

const API_BASE_URL = 'https://api.razorpay.com/v1';

export function getRazorpayOffer(): RazorpayOffer {
	const monthlyPricePaise = Number(process.env.PRO_MONTHLY_PRICE_PAISE ?? 39_900);
	const proMonthlyTokenAllowance = Number(
		process.env.PRO_MONTHLY_TOKEN_ALLOWANCE ?? 100_000,
	);
	if (!Number.isSafeInteger(monthlyPricePaise) || monthlyPricePaise <= 0) {
		throw ApiError.internal('PRO_MONTHLY_PRICE_PAISE must be a positive integer');
	}
	if (
		!Number.isSafeInteger(proMonthlyTokenAllowance) ||
		proMonthlyTokenAllowance <= 0
	) {
		throw ApiError.internal('PRO_MONTHLY_TOKEN_ALLOWANCE must be a positive integer');
	}
	return { monthlyPricePaise, proMonthlyTokenAllowance };
}

export function getRazorpayConfig(requireWebhookSecret = false): RazorpayConfig {
	const keyId = process.env.RAZORPAY_KEY_ID;
	const keySecret = process.env.RAZORPAY_KEY_SECRET;
	const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
	const planId = process.env.RAZORPAY_PRO_PLAN_ID;
	const offer = getRazorpayOffer();
	const missing = [
		!keyId && 'RAZORPAY_KEY_ID',
		!keySecret && 'RAZORPAY_KEY_SECRET',
		!planId && 'RAZORPAY_PRO_PLAN_ID',
		requireWebhookSecret && !webhookSecret && 'RAZORPAY_WEBHOOK_SECRET',
	].filter((value): value is string => Boolean(value));

	if (!keyId || !keySecret || !planId || (requireWebhookSecret && !webhookSecret)) {
		throw ApiError.internal('Razorpay is not configured', { missing });
	}
	return {
		keyId,
		keySecret,
		webhookSecret: webhookSecret ?? '',
		planId,
		...offer,
	};
}

export async function razorpayRequest<T>(
	method: Method,
	path: string,
	data?: unknown,
): Promise<T> {
	const config = getRazorpayConfig();
	try {
		const response = await axios.request<T>({
			method,
			url: `${API_BASE_URL}${path}`,
			...(data === undefined ? {} : { data }),
		auth: { username: config.keyId, password: config.keySecret },
			headers: { 'Content-Type': 'application/json' },
		timeout: 30_000,
		});
		return response.data;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			throw new ApiError(502, 'Razorpay request failed', {
				status: error.response?.status,
			});
		}
		throw error;
	}
}

export async function createRazorpaySubscription(input: {
	planId: string;
	totalCount: number;
	customerNotify: boolean;
	userId: string;
}): Promise<RazorpaySubscriptionResponse> {
	const response = await razorpayRequest<unknown>('POST', '/subscriptions', {
		plan_id: input.planId,
		total_count: input.totalCount,
		customer_notify: input.customerNotify,
		notes: { userId: input.userId },
	});
	if (
		typeof response !== 'object' || response === null ||
		!('id' in response) || typeof response.id !== 'string'
	) {
		throw ApiError.internal('Razorpay returned an invalid subscription');
	}
	return response as RazorpaySubscriptionResponse;
}

export async function cancelRazorpaySubscription(
	subscriptionId: string,
	cancelAtCycleEnd: boolean,
): Promise<void> {
	await razorpayRequest(
		'POST',
		`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
		{ cancel_at_cycle_end: cancelAtCycleEnd },
	);
}

export async function getRazorpayPlan(planId: string): Promise<RazorpayPlanResponse> {
	return razorpayRequest<RazorpayPlanResponse>(
		'GET',
		`/plans/${encodeURIComponent(planId)}`,
	);
}

export async function getRazorpaySubscription(subscriptionId: string) {
	return razorpayRequest<{
		id: string;
		status?: string;
		current_start?: number | null;
		current_end?: number | null;
		charge_at?: number | null;
		cancel_at_cycle_end?: boolean;
	}>('GET', `/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function getRazorpayPayment(paymentId: string) {
	return razorpayRequest<RazorpayPaymentResponse>(
		'GET',
		`/payments/${encodeURIComponent(paymentId)}`,
	);
}
