import { getDb } from '@/db';
import {
	paymentOrdersTable,
	razorpayWebhookEventsTable,
	subscriptionsTable,
} from '@/db/billing.schema';
import { usersTable } from '@/db/auth.schema';
import {
	type CancelSubscriptionInput,
	type CreateSubscriptionCheckoutInput,
	type RazorpayWebhookPayload,
	type SubscriptionStatus,
	type VerifySubscriptionPaymentInput,
	razorpayWebhookPayloadSchema,
} from '@/features/subscription/models/subscription.model';
import { getUserQuotaStatus } from '@/features/chat/services/chat.service';
import ApiError from '@/utils/apiError';
import {
	cancelRazorpaySubscription,
	createRazorpaySubscription,
	getRazorpayConfig,
	getRazorpayOffer,
	getRazorpayPlan,
	getRazorpayPayment,
	getRazorpaySubscription,
	type RazorpayConfig,
	type RazorpaySubscriptionResponse,
} from '@/integration/razorpay/razorpay';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
	and,
	desc,
	eq,
	sql,
} from 'drizzle-orm';

const FREE_MONTHLY_TOKEN_ALLOWANCE = 1_000;
type JsonRecord = Record<string, unknown>;

const subscriptionResponseFields = {
	id: subscriptionsTable.id,
	razorpaySubscriptionId: subscriptionsTable.razorpaySubscriptionId,
	razorpayPlanId: subscriptionsTable.razorpayPlanId,
	planType: subscriptionsTable.planType,
	status: subscriptionsTable.status,
	monthlyTokenAllowance: subscriptionsTable.monthlyTokenAllowance,
	currentPeriodStart: subscriptionsTable.currentPeriodStart,
	currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
	cancelAtCycleEnd: subscriptionsTable.cancelAtCycleEnd,
	createdAt: subscriptionsTable.createdAt,
	updatedAt: subscriptionsTable.updatedAt,
};

const paymentOrderResponseFields = {
	id: paymentOrdersTable.id,
	subscriptionId: paymentOrdersTable.subscriptionId,
	razorpayOrderId: paymentOrdersTable.razorpayOrderId,
	razorpayPaymentId: paymentOrdersTable.razorpayPaymentId,
	amountPaise: paymentOrdersTable.amountPaise,
	currency: paymentOrdersTable.currency,
	status: paymentOrdersTable.status,
	createdAt: paymentOrdersTable.createdAt,
	updatedAt: paymentOrdersTable.updatedAt,
};

const asRecord = (value: unknown): JsonRecord | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as JsonRecord)
		: null;

const stringValue = (value: unknown) =>
	typeof value === 'string' && value.length > 0 ? value : undefined;

const integerValue = (value: unknown) =>
	typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;

const getConfig = (includeWebhookSecret = false): RazorpayConfig => {
	return getRazorpayConfig(includeWebhookSecret);
};

const compareHexDigest = (received: string, expected: Buffer) => {
	if (!/^[\da-f]+$/i.test(received) || received.length !== expected.length * 2) {
		return false;
	}
	const receivedDigest = Buffer.from(received, 'hex');
	return (
		receivedDigest.length === expected.length &&
		timingSafeEqual(receivedDigest, expected)
	);
};

const dateFromEpoch = (value: unknown) => {
	const seconds = integerValue(value);
	return seconds && seconds > 0 ? new Date(seconds * 1000) : undefined;
};

const subscriptionStatus = (value: unknown): SubscriptionStatus | undefined => {
	const statuses: SubscriptionStatus[] = [
		'created',
		'authenticated',
		'active',
		'pending',
		'halted',
		'cancelled',
		'completed',
		'paused',
		'expired',
	];
	return typeof value === 'string'
		? statuses.find((status) => status === value)
		: undefined;
};

const eventStatus = (
	event: string,
	entity: JsonRecord | null,
): SubscriptionStatus | undefined => {
	switch (event) {
		case 'subscription.activated':
		case 'subscription.charged':
		case 'subscription.resumed':
			return 'active';
		case 'subscription.authenticated':
			return 'authenticated';
		case 'subscription.pending':
			return 'pending';
		case 'subscription.halted':
			return 'halted';
		case 'subscription.cancelled':
			return 'cancelled';
		case 'subscription.completed':
			return 'completed';
		case 'subscription.paused':
			return 'paused';
		case 'subscription.updated':
			return subscriptionStatus(entity?.status);
		default:
			return undefined;
	}
};

const nestedEntity = (payload: JsonRecord, name: string) =>
	asRecord(asRecord(payload[name])?.entity);

const webhookSubscriptionId = (payload: JsonRecord) => {
	const subscription = nestedEntity(payload, 'subscription');
	const payment = nestedEntity(payload, 'payment');
	const order = nestedEntity(payload, 'order');
	return (
		stringValue(subscription?.id) ??
		stringValue(payment?.subscription_id) ??
		stringValue(order?.subscription_id)
	);
};

const writePaymentOrder = async (
	tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0],
	payload: JsonRecord,
	localSubscription: {
		id: string;
		userId: string;
	} | undefined,
	event: string,
) => {
	if (!localSubscription) return;

	const order = nestedEntity(payload, 'order');
	const payment = nestedEntity(payload, 'payment');
	const razorpayOrderId =
		stringValue(order?.id) ?? stringValue(payment?.order_id);
	const amountPaise =
		integerValue(order?.amount) ?? integerValue(payment?.amount);

	if (!razorpayOrderId || amountPaise === undefined || amountPaise < 0) return;

	const status =
		event === 'payment.failed'
			? 'failed'
			: event === 'payment.refunded'
				? 'refunded'
				: event === 'subscription.charged' ||
					  event === 'payment.captured' ||
					  event === 'order.paid'
					? 'paid'
					: 'created';
	const currency =
		stringValue(order?.currency) ?? stringValue(payment?.currency) ?? 'INR';
	const paymentId = stringValue(payment?.id);
	const existingPayment = paymentId
		? await tx
				.select({ id: paymentOrdersTable.id })
				.from(paymentOrdersTable)
				.where(eq(paymentOrdersTable.razorpayPaymentId, paymentId))
				.limit(1)
		: [];
	if (existingPayment[0]) {
		await tx
			.update(paymentOrdersTable)
			.set({
				razorpayOrderId,
				amountPaise,
				currency,
				status,
				rawWebhookPayload: payload,
				updatedAt: new Date(),
			})
			.where(eq(paymentOrdersTable.id, existingPayment[0].id));
		return;
	}

	await tx
		.insert(paymentOrdersTable)
		.values({
			userId: localSubscription.userId,
			subscriptionId: localSubscription.id,
			razorpayOrderId,
			razorpayPaymentId: paymentId,
			amountPaise,
			currency,
			status,
			rawWebhookPayload: payload,
		})
		.onConflictDoUpdate({
			target: paymentOrdersTable.razorpayOrderId,
			set: {
				razorpayPaymentId: paymentId,
				status,
				rawWebhookPayload: payload,
				updatedAt: new Date(),
			},
		});
};

export const getBillingStatus = async (userId: string) => {
	const db = getDb();
	const quota = await getUserQuotaStatus(userId);
	const [user] = await db
		.select({
			planType: usersTable.planType,
			passStatus: usersTable.passStatus,
			passExpiryDate: usersTable.passExpiryDate,
		})
		.from(usersTable)
		.where(eq(usersTable.id, userId))
		.limit(1);
	if (!user) throw ApiError.notFound('User not found');

	const subscriptions = await db
		.select(subscriptionResponseFields)
		.from(subscriptionsTable)
		.where(eq(subscriptionsTable.userId, userId))
		.orderBy(desc(subscriptionsTable.createdAt))
		.limit(5);
	const paymentOrders = await db
		.select(paymentOrderResponseFields)
		.from(paymentOrdersTable)
		.where(eq(paymentOrdersTable.userId, userId))
		.orderBy(desc(paymentOrdersTable.createdAt))
		.limit(10);

	return {
		planType: user.planType,
		passStatus: user.passStatus,
		passExpiryDate: user.passExpiryDate,
		proOffer: getRazorpayOffer(),
		quota: {
			monthlyTokenAllowance: quota.monthlyTokenAllowance,
			tokensUsedThisMonth: quota.tokensUsedThisMonth,
			lastMonthlyReset: quota.lastMonthlyReset,
		},
		subscription: subscriptions[0] ?? null,
		orders: paymentOrders ?? [],
	};
};

export const createSubscriptionCheckout = async (
	userId: string,
	input: CreateSubscriptionCheckoutInput,
) => {
	if (input.planType !== 'pro') {
		throw ApiError.badRequest('Only Pro subscriptions are available');
	}
	const config = getConfig();
	// The server-side plan is authoritative; clients may only echo the same plan ID.
	if (input.planId && input.planId !== config.planId) {
		throw ApiError.badRequest('The requested plan does not match the configured Pro plan');
	}

	const db = getDb();
	const [existing] = await db
		.select({
			id: subscriptionsTable.id,
			razorpaySubscriptionId: subscriptionsTable.razorpaySubscriptionId,
			status: subscriptionsTable.status,
		})
		.from(subscriptionsTable)
		.where(
			and(
				eq(subscriptionsTable.userId, userId),
				sql`${subscriptionsTable.status} IN ('created', 'authenticated', 'active', 'pending', 'paused')`,
			),
		)
		.limit(1);
	if (existing) {
		if (
			(existing.status === 'created' || existing.status === 'authenticated') &&
			existing.razorpaySubscriptionId
		) {
			return {
				subscriptionId: existing.razorpaySubscriptionId,
				razorpaySubscriptionId: existing.razorpaySubscriptionId,
				localSubscriptionId: existing.id,
				keyId: config.keyId,
				shortUrl: null,
			};
		}
		if (existing.status === 'active') {
			throw ApiError.conflict('Your Pro subscription is already active', {
				code: 'SUBSCRIPTION_ALREADY_ACTIVE',
			});
		}
		throw ApiError.conflict('A Pro subscription is already being processed. Refresh billing status or contact support.', {
			code: 'SUBSCRIPTION_IN_PROGRESS',
		});
	}

	const plan = await getRazorpayPlan(config.planId);
	if (
		plan.item?.amount !== config.monthlyPricePaise ||
		plan.item.currency !== 'INR' ||
		plan.period !== 'monthly' ||
		plan.interval !== 1
	) {
		throw ApiError.internal(
			'Razorpay Pro plan must be configured as a monthly INR plan for INR 399 and 100,000 tokens.',
			{ code: 'RAZORPAY_PLAN_CONFIGURATION_MISMATCH' },
		);
	}

	const razorpaySubscription: RazorpaySubscriptionResponse =
		await createRazorpaySubscription({
			planId: config.planId,
			totalCount: input.totalCount ?? 120,
			customerNotify: input.customerNotify,
			userId,
		});

	const razorpaySubscriptionId = stringValue(razorpaySubscription.id);
	if (!razorpaySubscriptionId) {
		throw ApiError.internal('Razorpay returned an invalid subscription ID');
	}

	const [subscription] = await db
		.insert(subscriptionsTable)
		.values({
			userId,
			razorpaySubscriptionId,
			razorpayPlanId: config.planId,
			monthlyTokenAllowance: config.proMonthlyTokenAllowance,
			status: subscriptionStatus(razorpaySubscription.status) ?? 'created',
			cancelAtCycleEnd: false,
		})
		.returning();
	if (!subscription) {
		throw ApiError.internal('Unable to persist the Razorpay subscription');
	}

	return {
		subscriptionId: razorpaySubscriptionId,
		razorpaySubscriptionId,
		localSubscriptionId: subscription.id,
		keyId: config.keyId,
		shortUrl: stringValue(razorpaySubscription.short_url) ?? null,
	};
};

export const verifySubscriptionPayment = async (
	userId: string,
	input: VerifySubscriptionPaymentInput,
) => {
	const { keySecret } = getConfig();
	const expected = createHmac('sha256', keySecret)
		.update(`${input.razorpay_payment_id}|${input.razorpay_subscription_id}`)
		.digest();
	if (!compareHexDigest(input.razorpay_signature, expected)) {
		throw ApiError.badRequest('Invalid Razorpay payment signature', {
			code: 'INVALID_PAYMENT_SIGNATURE',
		});
	}

	const db = getDb();
	const [subscription] = await db
		.select()
		.from(subscriptionsTable)
		.where(
			and(
				eq(subscriptionsTable.userId, userId),
				eq(
					subscriptionsTable.razorpaySubscriptionId,
					input.razorpay_subscription_id,
				),
			),
		)
		.limit(1);
	if (!subscription) throw ApiError.notFound('Subscription not found');

	const [razorpaySubscription, razorpayPayment] = await Promise.all([
		getRazorpaySubscription(input.razorpay_subscription_id),
		getRazorpayPayment(input.razorpay_payment_id),
	]);
	if (
		razorpaySubscription.id !== input.razorpay_subscription_id ||
		(razorpayPayment.subscription_id &&
			razorpayPayment.subscription_id !== input.razorpay_subscription_id)
	) {
		throw ApiError.badRequest('Razorpay payment does not match this subscription');
	}

	return db.transaction(async (tx) => {
		const resolvedStatus = subscriptionStatus(razorpaySubscription.status);
		const currentPeriodStart =
			dateFromEpoch(razorpaySubscription.current_start) ??
			subscription.currentPeriodStart;
		const currentPeriodEnd =
			dateFromEpoch(razorpaySubscription.current_end) ??
			dateFromEpoch(razorpaySubscription.charge_at) ??
			subscription.currentPeriodEnd;
		const [updated] = await tx
			.update(subscriptionsTable)
			.set({
				status:
					resolvedStatus ??
						(subscription.status === 'created'
							? 'authenticated'
							: subscription.status),
				currentPeriodStart,
				currentPeriodEnd,
				razorpayPaymentId: input.razorpay_payment_id,
				razorpaySignature: input.razorpay_signature,
				updatedAt: new Date(),
			})
			.where(eq(subscriptionsTable.id, subscription.id))
			.returning(subscriptionResponseFields);
		if (!updated) {
			throw ApiError.internal('Unable to verify the subscription payment');
		}

		const razorpayOrderId =
			razorpayPayment.order_id ?? `payment:${razorpayPayment.id}`;
		const paymentStatus: 'paid' | 'created' =
			razorpayPayment.status === 'captured' ? 'paid' : 'created';
		const existingPayment = await tx
			.select({ id: paymentOrdersTable.id })
			.from(paymentOrdersTable)
			.where(eq(paymentOrdersTable.razorpayPaymentId, input.razorpay_payment_id))
			.limit(1);
		const paymentValues = {
				userId,
				subscriptionId: subscription.id,
				razorpayOrderId,
				razorpayPaymentId: input.razorpay_payment_id,
				amountPaise: razorpayPayment.amount,
				currency: razorpayPayment.currency,
				status: paymentStatus,
				razorpaySignature: input.razorpay_signature,
				rawWebhookPayload: {
					verifiedByCheckout: true,
					payment: razorpayPayment as unknown as JsonRecord,
				},
			};
		if (existingPayment[0]) {
			await tx
				.update(paymentOrdersTable)
				.set({
					razorpayOrderId,
					razorpaySignature: input.razorpay_signature,
					status: paymentStatus,
					rawWebhookPayload: paymentValues.rawWebhookPayload,
					updatedAt: new Date(),
				})
				.where(eq(paymentOrdersTable.id, existingPayment[0].id));
		} else {
			await tx.insert(paymentOrdersTable).values(paymentValues);
		}

		if (resolvedStatus === 'active') {
			await tx
				.update(usersTable)
				.set({
					planType: 'pro',
					passStatus: 'active',
					passExpiryDate: currentPeriodEnd,
					monthlyTokenAllowance: subscription.monthlyTokenAllowance,
				})
				.where(eq(usersTable.id, userId));
		}

		return updated;
	});
};

export const cancelUserSubscription = async (
	userId: string,
	input: CancelSubscriptionInput,
) => {
	const config = getConfig();
	const db = getDb();
	const [subscription] = await db
		.select()
		.from(subscriptionsTable)
		.where(
			and(
				eq(subscriptionsTable.id, input.subscriptionId),
				eq(subscriptionsTable.userId, userId),
			),
		)
		.limit(1);
	if (!subscription) throw ApiError.notFound('Subscription not found');
	if (!subscription.razorpaySubscriptionId) {
		throw ApiError.badRequest('Subscription is missing its Razorpay ID');
	}
	if (['cancelled', 'completed', 'expired'].includes(subscription.status)) {
		throw ApiError.conflict('Subscription is already terminated');
	}

	await cancelRazorpaySubscription(
		subscription.razorpaySubscriptionId,
		input.cancelAtCycleEnd,
	);

	return db.transaction(async (tx) => {
		const now = new Date();
		const [updated] = await tx
			.update(subscriptionsTable)
			.set({
				cancelAtCycleEnd: input.cancelAtCycleEnd,
				status: input.cancelAtCycleEnd ? subscription.status : 'cancelled',
				updatedAt: now,
			})
			.where(
				and(
					eq(subscriptionsTable.id, subscription.id),
					eq(subscriptionsTable.userId, userId),
				),
			)
			.returning(subscriptionResponseFields);
		if (!updated) {
			throw ApiError.internal('Unable to update subscription status');
		}

		if (!input.cancelAtCycleEnd) {
			await tx
				.update(usersTable)
				.set({
					planType: 'free',
					passStatus: 'expired',
					passExpiryDate: now,
					monthlyTokenAllowance: FREE_MONTHLY_TOKEN_ALLOWANCE,
				})
				.where(eq(usersTable.id, userId));
		}

		return updated;
	});
};

export const handleRazorpayWebhook = async (
	rawBody: string,
	signature: string,
	receivedEventId?: string | null,
) => {
	if (!signature) {
		throw ApiError.unauthorized('Missing Razorpay webhook signature', {
			code: 'MISSING_WEBHOOK_SIGNATURE',
		});
	}

	const config = getConfig(true);
	const expected = createHmac('sha256', config.webhookSecret)
		.update(rawBody)
		.digest();
	if (!compareHexDigest(signature, expected)) {
		throw ApiError.unauthorized('Invalid Razorpay webhook signature', {
			code: 'INVALID_WEBHOOK_SIGNATURE',
		});
	}

	let untrustedPayload: unknown;
	try {
		untrustedPayload = JSON.parse(rawBody) as unknown;
	} catch {
		throw ApiError.badRequest('Invalid Razorpay webhook JSON');
	}

	const parsedPayload = razorpayWebhookPayloadSchema.safeParse(untrustedPayload);
	if (!parsedPayload.success) {
		throw ApiError.badRequest('Invalid Razorpay webhook payload', {
			issues: parsedPayload.error.flatten(),
		});
	}

	const webhook: RazorpayWebhookPayload = parsedPayload.data;
	const payloadRecord = asRecord(untrustedPayload);
	if (!payloadRecord) throw ApiError.badRequest('Invalid Razorpay webhook payload');
	const headerEventId = receivedEventId?.trim();
	const eventId =
		headerEventId && headerEventId.length <= 255
			? headerEventId
			: createHash('sha256').update(rawBody).digest('hex');
	const payload = webhook.payload;
	const subId = webhookSubscriptionId(payload);
	const entity = nestedEntity(payload, 'subscription');
	const status = eventStatus(webhook.event, entity);
	const periodStart = dateFromEpoch(entity?.current_start);
	const periodEnd =
		dateFromEpoch(entity?.current_end) ?? dateFromEpoch(entity?.charge_at);
	const db = getDb();

	return db.transaction(async (tx) => {
		const [eventRecord] = await tx
			.insert(razorpayWebhookEventsTable)
			.values({
				eventId,
				event: webhook.event,
				rawPayload: payloadRecord,
			})
			.onConflictDoNothing({
				target: razorpayWebhookEventsTable.eventId,
			})
			.returning({ id: razorpayWebhookEventsTable.id });

		if (!eventRecord) return { accepted: true, duplicate: true };

		let localSubscription:
			| { id: string; userId: string; currentPeriodStart: Date | null; currentPeriodEnd: Date | null; monthlyTokenAllowance: number; status: SubscriptionStatus; cancelAtCycleEnd: boolean }
			| undefined;

		if (subId) {
			const [foundSubscription] = await tx
				.select({
					id: subscriptionsTable.id,
					userId: subscriptionsTable.userId,
					currentPeriodStart: subscriptionsTable.currentPeriodStart,
					currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
					monthlyTokenAllowance: subscriptionsTable.monthlyTokenAllowance,
					status: subscriptionsTable.status,
					cancelAtCycleEnd: subscriptionsTable.cancelAtCycleEnd,
				})
				.from(subscriptionsTable)
				.where(eq(subscriptionsTable.razorpaySubscriptionId, subId))
				.limit(1);
			localSubscription = foundSubscription;
		}

		await writePaymentOrder(tx, payload, localSubscription, webhook.event);

		if (!localSubscription || !status) {
			return { accepted: true, duplicate: false };
		}

		const now = new Date();
		const effectivePeriodStart = periodStart ?? localSubscription.currentPeriodStart;
		const effectivePeriodEnd = periodEnd ?? localSubscription.currentPeriodEnd;
		await tx
			.update(subscriptionsTable)
			.set({
				status,
				currentPeriodStart: effectivePeriodStart,
				currentPeriodEnd: effectivePeriodEnd,
				cancelAtCycleEnd:
					typeof entity?.cancel_at_cycle_end === 'boolean'
						? entity.cancel_at_cycle_end
						: localSubscription.cancelAtCycleEnd,
				updatedAt: now,
			})
			.where(eq(subscriptionsTable.id, localSubscription.id));

		const isNewCycle =
			webhook.event === 'subscription.charged' ||
			(webhook.event === 'subscription.activated' &&
				(!localSubscription.currentPeriodStart ||
					(periodStart !== undefined &&
						periodStart > localSubscription.currentPeriodStart)));

		if (status === 'active') {
			await tx
				.update(usersTable)
				.set({
					planType: 'pro',
					passStatus: 'active',
					passExpiryDate: effectivePeriodEnd ?? null,
					monthlyTokenAllowance: localSubscription.monthlyTokenAllowance,
					...(isNewCycle && {
						tokensUsedThisMonth: 0,
						lastMonthlyReset: now,
					}),
				})
				.where(eq(usersTable.id, localSubscription.userId));
		} else if (
			status === 'halted' ||
			status === 'completed' ||
			status === 'expired'
		) {
			await tx
				.update(usersTable)
				.set({
					planType: 'free',
					passStatus: 'expired',
					passExpiryDate: now,
					monthlyTokenAllowance: FREE_MONTHLY_TOKEN_ALLOWANCE,
				})
				.where(eq(usersTable.id, localSubscription.userId));
		} else if (status === 'cancelled') {
			const cancelAtCycleEnd =
				typeof entity?.cancel_at_cycle_end === 'boolean'
					? entity.cancel_at_cycle_end
					: localSubscription.cancelAtCycleEnd;
			const immediateRevocation =
				!cancelAtCycleEnd ||
				!effectivePeriodEnd ||
				effectivePeriodEnd.getTime() <= now.getTime();

			if (immediateRevocation) {
				await tx
					.update(usersTable)
					.set({
						planType: 'free',
						passStatus: 'expired',
						passExpiryDate: now,
						monthlyTokenAllowance: FREE_MONTHLY_TOKEN_ALLOWANCE,
					})
					.where(eq(usersTable.id, localSubscription.userId));
			}
		} else if (
			(status === 'paused' || status === 'pending') &&
			effectivePeriodEnd &&
			effectivePeriodEnd.getTime() <= now.getTime()
		) {
			await tx
				.update(usersTable)
				.set({
					planType: 'free',
					passStatus: 'expired',
					passExpiryDate: now,
					monthlyTokenAllowance: FREE_MONTHLY_TOKEN_ALLOWANCE,
				})
				.where(eq(usersTable.id, localSubscription.userId));
		}

		return { accepted: true, duplicate: false };
	});
};
