import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { paymentOrdersTable, subscriptionsTable } from '@/db/billing.schema';

// ==================== ENUMS & CONSTANTS ====================
export const subscriptionStatuses = [
	'created',
	'authenticated',
	'active',
	'pending',
	'halted',
	'cancelled',
	'completed',
	'paused',
	'expired',
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const paymentOrderStatuses = [
	'created',
	'paid',
	'failed',
	'refunded',
] as const;
export type PaymentOrderStatus = (typeof paymentOrderStatuses)[number];

// ==================== DRIZZLE-ZOD BASE SCHEMAS ====================
export const selectSubscriptionSchema = createSelectSchema(subscriptionsTable);
export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable, {
	razorpayPlanId: z.string().min(1, 'Razorpay plan ID is required').max(255),
	planType: z.string().min(1).max(32),
	monthlyTokenAllowance: z.number().int().positive(),
});

export const selectPaymentOrderSchema = createSelectSchema(paymentOrdersTable);
export const insertPaymentOrderSchema = createInsertSchema(paymentOrdersTable, {
	razorpayOrderId: z.string().min(1, 'Razorpay order ID is required').max(255),
	razorpayPaymentId: z.string().max(255).optional().nullable(),
	razorpaySignature: z.string().max(512).optional().nullable(),
	amountPaise: z.number().int().nonnegative(),
	currency: z.string().min(3).max(10),
});

// ==================== API REQUEST & WEBHOOK SCHEMAS ====================

// 1. Initiate a Pro subscription checkout
export const createSubscriptionCheckoutSchema = z.object({
	planId: z.string().trim().min(1, 'Plan ID is required').max(255).optional(),
	planType: z.enum(['free', 'pro']).default('pro'),
	totalCount: z.number().int().min(1).max(120).optional(),
	customerNotify: z.boolean().optional().default(true),
});

// 2. Verify client checkout callback payload
export const verifySubscriptionPaymentSchema = z.object({
	razorpay_payment_id: z.string().trim().min(1),
	razorpay_subscription_id: z.string().trim().min(1),
	razorpay_signature: z.string().trim().min(1),
});

// 3. Cancel an existing subscription
export const cancelSubscriptionSchema = z.object({
	subscriptionId: z.string().uuid('Invalid subscription ID'),
	cancelAtCycleEnd: z.boolean().optional().default(true),
});

// 4. Razorpay webhook envelope validation
export const razorpayWebhookPayloadSchema = z.object({
	entity: z.string().optional(),
	account_id: z.string().optional(),
	event: z.string().min(1),
	contains: z.array(z.string()).optional(),
	created_at: z.number().optional(),
	payload: z.record(z.string(), z.unknown()),
});

// ==================== TYPE EXPORTS ====================
export type Subscription = z.infer<typeof selectSubscriptionSchema>;
export type NewSubscription = z.infer<typeof insertSubscriptionSchema>;
export type PaymentOrder = z.infer<typeof selectPaymentOrderSchema>;
export type NewPaymentOrder = z.infer<typeof insertPaymentOrderSchema>;

export type CreateSubscriptionCheckoutInput = z.infer<
	typeof createSubscriptionCheckoutSchema
>;
export type VerifySubscriptionPaymentInput = z.infer<
	typeof verifySubscriptionPaymentSchema
>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type RazorpayWebhookPayload = z.infer<
	typeof razorpayWebhookPayloadSchema
>;
