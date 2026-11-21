import {
	boolean,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

// ==================== ENUMS ====================
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'guest']);

// Simplified pass status for subscription tracking
export const passStatusEnum = pgEnum('pass_status', [
	'inactive',
	'active',
	'expired',
]);

export const planTypeEnum = pgEnum('plan_type', ['free', 'pro']);

// ==================== USERS TABLE ====================
export const usersTable = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),

	authId: varchar('auth_id', { length: 255 }).unique(),

	firstName: varchar('first_name', { length: 255 }).notNull(),
	lastName: varchar('last_name', { length: 255 }),

	email: varchar('email', { length: 255 }).notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),

	password: varchar('password', { length: 255 }),

	role: userRoleEnum('role')
		.default('user')
		.notNull()
		.$type<'user' | 'admin' | 'guest'>(),

	refreshToken: text('refresh_token'),
	verificationToken: text('verification_token'),

	resetPasswordToken: text('reset_token'),
	resetPasswordExpiry: timestamp('reset_token_expiry', {
		withTimezone: true,
	}),

	// ================= SUBSCRIPTION & PAYMENT =================
	lastOrderId: varchar('last_order_id', { length: 255 }), // Tracks the latest Razorpay order_id

	planType: planTypeEnum('plan_type')
		.default('free')
		.notNull()
		.$type<'free' | 'pro'>(),

	passStatus: passStatusEnum('pass_status')
		.default('inactive')
		.notNull()
		.$type<'inactive' | 'active' | 'expired'>(),

	passExpiryDate: timestamp('pass_expiry_date', {
		withTimezone: true,
	}),
	// ==========================================================

	// ================= TOKEN USAGE ============================
	monthlyTokenAllowance: integer('monthly_token_allowance')
		.default(1000)
		.notNull(),
	tokensUsedThisMonth: integer('tokens_used_this_month').default(0).notNull(),

	lastMonthlyReset: timestamp('last_monthly_reset', { withTimezone: true })
		.defaultNow()
		.notNull(),
	// ==========================================================

	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(
		() => new Date(),
	),
});

// ==================== PUBLIC COLUMNS EXPORT ====================
export const userPublicColumns = {
	id: usersTable.id,
	firstName: usersTable.firstName,
	lastName: usersTable.lastName,
	email: usersTable.email,
	emailVerified: usersTable.emailVerified,
	role: usersTable.role,
	lastOrderId: usersTable.lastOrderId,
	planType: usersTable.planType,
	passStatus: usersTable.passStatus,
	passExpiryDate: usersTable.passExpiryDate,
	monthlyTokenAllowance: usersTable.monthlyTokenAllowance,
	tokensUsedThisMonth: usersTable.tokensUsedThisMonth,
	lastMonthlyReset: usersTable.lastMonthlyReset,
	createdAt: usersTable.createdAt,
	updatedAt: usersTable.updatedAt,
};
