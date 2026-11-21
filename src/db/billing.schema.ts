import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { usersTable } from './auth.schema';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
	'created',
	'authenticated',
	'active',
	'pending',
	'halted',
	'cancelled',
	'completed',
	'paused',
	'expired',
]);

export const paymentOrderStatusEnum = pgEnum('payment_order_status', [
	'created',
	'paid',
	'failed',
	'refunded',
]);

export const subscriptionsTable = pgTable(
	'subscriptions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }),
		razorpaySubscriptionId: varchar('razorpay_subscription_id', {
			length: 255,
		}).unique(),
		razorpayPaymentId: varchar('razorpay_payment_id', { length: 255 }).unique(),
		razorpaySignature: varchar('razorpay_signature', { length: 512 }),
		razorpayPlanId: varchar('razorpay_plan_id', { length: 255 }).notNull(),
		planType: varchar('plan_type', { length: 32 }).default('pro').notNull(),
		status: subscriptionStatusEnum('status')
			.default('created')
			.notNull()
			.$type<
				| 'created'
				| 'authenticated'
				| 'active'
				| 'pending'
				| 'halted'
				| 'cancelled'
				| 'completed'
				| 'paused'
				| 'expired'
			>(),
		monthlyTokenAllowance: integer('monthly_token_allowance')
			.default(1000)
			.notNull(),
		currentPeriodStart: timestamp('current_period_start', {
			withTimezone: true,
		}),
		currentPeriodEnd: timestamp('current_period_end', {
			withTimezone: true,
		}),
		cancelAtCycleEnd: boolean('cancel_at_cycle_end').default(false).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index('subscriptions_user_status_idx').on(table.userId, table.status),
	],
);

export const razorpayWebhookEventsTable = pgTable(
	'razorpay_webhook_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		eventId: varchar('event_id', { length: 255 }).notNull().unique(),
		event: varchar('event', { length: 120 }).notNull(),
		rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull(),
		receivedAt: timestamp('received_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index('razorpay_webhook_events_received_idx').on(table.receivedAt),
	],
);

export const paymentOrdersTable = pgTable(
	'payment_orders',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }),
		subscriptionId: uuid('subscription_id').references(
			() => subscriptionsTable.id,
			{ onDelete: 'set null' },
		),
		razorpayOrderId: varchar('razorpay_order_id', { length: 255 })
			.notNull()
			.unique(),
		razorpayPaymentId: varchar('razorpay_payment_id', { length: 255 }).unique(),
		razorpaySignature: varchar('razorpay_signature', { length: 512 }),
		amountPaise: integer('amount_paise').notNull(),
		currency: varchar('currency', { length: 10 }).default('INR').notNull(),
		status: paymentOrderStatusEnum('status')
			.default('created')
			.notNull()
			.$type<'created' | 'paid' | 'failed' | 'refunded'>(),
		rawWebhookPayload: jsonb('raw_webhook_payload').$type<
			Record<string, unknown>
		>(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index('payment_orders_user_created_idx').on(table.userId, table.createdAt),
	],
);
