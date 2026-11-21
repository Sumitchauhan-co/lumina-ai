import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { usersTable } from './auth.schema';

export const messageRoleEnum = pgEnum('message_role', [
	'system',
	'user',
	'assistant',
	'tool',
]);

export const conversationsTable = pgTable(
	'conversations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 255 }).default('New Chat').notNull(),
		defaultModel: varchar('default_model', { length: 120 })
			.default('openai/gpt-4o-mini')
			.notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index('conversations_user_updated_idx').on(table.userId, table.updatedAt),
	],
);

export const messagesTable = pgTable(
	'messages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => conversationsTable.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }),
		role: messageRoleEnum('role')
			.notNull()
			.$type<'system' | 'user' | 'assistant' | 'tool'>(),
		content: text('content').notNull(),
		model: varchar('model', { length: 120 }),
		promptTokens: integer('prompt_tokens').default(0).notNull(),
		completionTokens: integer('completion_tokens').default(0).notNull(),
		totalTokens: integer('total_tokens').default(0).notNull(),
		metadata: jsonb('metadata').$type<Record<string, unknown>>(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index('messages_conversation_created_idx').on(
			table.conversationId,
			table.createdAt,
		),
		index('messages_user_created_idx').on(table.userId, table.createdAt),
	],
);
