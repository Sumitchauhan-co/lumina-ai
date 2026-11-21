import { getDb } from '@/db';
import { conversationsTable, messagesTable } from '@/db/chat.schema';
import { usersTable } from '@/db/auth.schema';
import ApiError from '@/utils/apiError';
import { buildGuardrailedChatPrompt } from '@/utils/prompt';
import { ALLOWED_MODELS } from '@/integration/openrouter/openrouter';
import {
	type ChatMessage,
	type CreateConversationInput,
	type EditMessageInput,
	type RecordAssistantMessageInput,
	type SendMessageInput,
	type UpdateConversationInput,
} from '@/features/chat/models/chat.model';
import {
	and,
	asc,
	desc,
	eq,
	inArray,
	lte,
	sql,
} from 'drizzle-orm';

const FREE_MODEL_DEFAULTS: string[] = [ALLOWED_MODELS.freeFast];
const PRO_MODEL_DEFAULTS: string[] = [
	ALLOWED_MODELS.proOmni,
	ALLOWED_MODELS.proBalanced,
	ALLOWED_MODELS.proReasoning,
];
const DEFAULT_MODEL = ALLOWED_MODELS.freeFast;
const THIRTY_DAY_MS = 30 * 24 * 60 * 60 * 1000;
const FREE_MONTHLY_TOKEN_ALLOWANCE = 1_000;

export interface UserQuotaStatus {
	monthlyTokenAllowance: number;
	tokensUsedThisMonth: number;
	lastMonthlyReset: Date;
}

export interface PreparedChatCompletion {
	conversationId: string;
	model: string;
	messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>;
	quota: UserQuotaStatus;
	maxCompletionTokens: number;
}

const freeModels = (): Set<string> => new Set(FREE_MODEL_DEFAULTS);

const proModels = (): Set<string> => {
	const models = new Set(PRO_MODEL_DEFAULTS);
	for (const model of freeModels()) models.add(model);
	return models;
};

const expirePastDueProAccess = async (userId: string, now = new Date()) => {
	await getDb()
		.update(usersTable)
		.set({
			planType: 'free',
			passStatus: 'expired',
			passExpiryDate: now,
			monthlyTokenAllowance: FREE_MONTHLY_TOKEN_ALLOWANCE,
		})
		.where(
			and(
				eq(usersTable.id, userId),
				eq(usersTable.planType, 'pro'),
				eq(usersTable.passStatus, 'active'),
				lte(usersTable.passExpiryDate, now),
			),
		);
};

const throwIfQuotaExceeded = (quota: UserQuotaStatus) => {
	if (quota.tokensUsedThisMonth >= quota.monthlyTokenAllowance) {
		throw new ApiError(429, 'Monthly token quota exceeded', {
			code: 'MONTHLY_QUOTA_EXCEEDED',
			...quota,
		});
	}
};

const assertModelAccess = async (userId: string, model: string) => {
	const db = getDb();
	await expirePastDueProAccess(userId);
	const [user] = await db
		.select({ planType: usersTable.planType, passStatus: usersTable.passStatus })
		.from(usersTable)
		.where(eq(usersTable.id, userId))
		.limit(1);

	if (!user) throw ApiError.notFound('User not found');

	const hasProAccess = user.planType === 'pro' && user.passStatus === 'active';
	const allowedModels = hasProAccess ? proModels() : freeModels();

	if (allowedModels.has(model)) return;
	if (!hasProAccess) {
		throw ApiError.forbidden('This model requires an active Pro subscription', {
			code: 'MODEL_REQUIRES_PRO',
			model,
		});
	}

	throw ApiError.badRequest('The requested model is not configured', {
		code: 'MODEL_NOT_CONFIGURED',
		model,
	});
};

export const getUserQuotaStatus = async (
	userId: string,
): Promise<UserQuotaStatus> => {
	const db = getDb();
	const now = new Date();
	await checkAndResetUserQuotas(userId, now);

	const [user] = await db
		.select({
			monthlyTokenAllowance: usersTable.monthlyTokenAllowance,
			tokensUsedThisMonth: usersTable.tokensUsedThisMonth,
			lastMonthlyReset: usersTable.lastMonthlyReset,
		})
		.from(usersTable)
		.where(eq(usersTable.id, userId))
		.limit(1);

	if (!user) throw ApiError.notFound('User not found');

	return user;
};

export const checkAndResetUserQuotas = async (
	userId: string,
	now = new Date(),
) => {
	const db = getDb();
	const monthlyCutoff = new Date(now.getTime() - THIRTY_DAY_MS);

	await expirePastDueProAccess(userId, now);

	await db
		.update(usersTable)
		.set({ tokensUsedThisMonth: 0, lastMonthlyReset: now })
		.where(
			and(
				eq(usersTable.id, userId),
				lte(usersTable.lastMonthlyReset, monthlyCutoff),
			),
		);
};

export const getConversationWithMessages = async (
	userId: string,
	conversationId: string,
) => {
	const db = getDb();
	const [conversation] = await db
		.select()
		.from(conversationsTable)
		.where(
			and(
				eq(conversationsTable.id, conversationId),
				eq(conversationsTable.userId, userId),
			),
		)
		.limit(1);

	if (!conversation) throw ApiError.notFound('Conversation not found');

	const messages = await db
		.select()
		.from(messagesTable)
		.where(
			and(
				eq(messagesTable.conversationId, conversationId),
				eq(messagesTable.userId, userId),
			),
		)
		.orderBy(asc(messagesTable.createdAt), asc(messagesTable.id));

	return { ...conversation, messages };
};

export const listConversations = async (userId: string) =>
	getDb()
		.select()
		.from(conversationsTable)
		.where(eq(conversationsTable.userId, userId))
		.orderBy(desc(conversationsTable.updatedAt));

export const createConversation = async (
	userId: string,
	input: CreateConversationInput,
) => {
	const model = input.defaultModel ?? DEFAULT_MODEL;
	await assertModelAccess(userId, model);
	const [conversation] = await getDb()
		.insert(conversationsTable)
		.values({
			userId,
			title: input.title ?? 'New Chat',
			defaultModel: model,
		})
		.returning();

	if (!conversation) throw ApiError.internal('Unable to create conversation');
	return conversation;
};

export const updateConversation = async (
	userId: string,
	conversationId: string,
	input: UpdateConversationInput,
) => {
	if (input.title === undefined && input.defaultModel === undefined) {
		throw ApiError.badRequest('Provide a conversation title or model to update');
	}
	if (input.defaultModel) await assertModelAccess(userId, input.defaultModel);

	const [conversation] = await getDb()
		.update(conversationsTable)
		.set({ ...input, updatedAt: new Date() })
		.where(
			and(
				eq(conversationsTable.id, conversationId),
				eq(conversationsTable.userId, userId),
			),
		)
		.returning();

	if (!conversation) throw ApiError.notFound('Conversation not found');
	return conversation;
};

export const editConversationPrompt = async (
	userId: string,
	conversationId: string,
	messageId: string,
	input: EditMessageInput,
) => {
	const db = getDb();
	return db.transaction(async (tx) => {
		const [conversation] = await tx
			.select({ id: conversationsTable.id })
			.from(conversationsTable)
			.where(
				and(
					eq(conversationsTable.id, conversationId),
					eq(conversationsTable.userId, userId),
				),
			)
			.limit(1);
		if (!conversation) throw ApiError.notFound('Conversation not found');

		const messages = await tx
			.select({ id: messagesTable.id, role: messagesTable.role })
			.from(messagesTable)
			.where(
				and(
					eq(messagesTable.conversationId, conversationId),
					eq(messagesTable.userId, userId),
				),
			)
			.orderBy(asc(messagesTable.createdAt), asc(messagesTable.id));
		const promptIndex = messages.findIndex(
			(message) => message.id === messageId && message.role === 'user',
		);
		if (promptIndex < 0) throw ApiError.notFound('User prompt not found');

		const responseIds: string[] = [];
		for (const message of messages.slice(promptIndex + 1)) {
			if (message.role === 'user') break;
			if (message.role === 'assistant' || message.role === 'tool') {
				responseIds.push(message.id);
			}
		}

		const [updatedPrompt] = await tx
			.update(messagesTable)
			.set({ content: input.content })
			.where(
				and(
					eq(messagesTable.id, messageId),
					eq(messagesTable.conversationId, conversationId),
					eq(messagesTable.userId, userId),
					eq(messagesTable.role, 'user'),
				),
			)
			.returning({ id: messagesTable.id, content: messagesTable.content });
		if (!updatedPrompt) throw ApiError.notFound('User prompt not found');

		if (responseIds.length > 0) {
			await tx
				.delete(messagesTable)
				.where(
					and(
						eq(messagesTable.conversationId, conversationId),
						eq(messagesTable.userId, userId),
						inArray(messagesTable.id, responseIds),
					),
				);
		}

		await tx
			.update(conversationsTable)
			.set({ updatedAt: new Date() })
			.where(eq(conversationsTable.id, conversationId));

		return { prompt: updatedPrompt, deletedMessageIds: responseIds };
	});
};

export const deleteConversation = async (
	userId: string,
	conversationId: string,
) => {
	const [conversation] = await getDb()
		.delete(conversationsTable)
		.where(
			and(
				eq(conversationsTable.id, conversationId),
				eq(conversationsTable.userId, userId),
			),
		)
		.returning({ id: conversationsTable.id });

	if (!conversation) throw ApiError.notFound('Conversation not found');
	return conversation;
};

export const prepareChatCompletion = async (
	userId: string,
	input: SendMessageInput,
): Promise<PreparedChatCompletion> => {
	const quota = await getUserQuotaStatus(userId);
	throwIfQuotaExceeded(quota);

	const db = getDb();
	let conversationModel: string = DEFAULT_MODEL;

	if (input.conversationId) {
		const [conversation] = await db
			.select({ defaultModel: conversationsTable.defaultModel })
			.from(conversationsTable)
			.where(
				and(
					eq(conversationsTable.id, input.conversationId),
					eq(conversationsTable.userId, userId),
				),
			)
			.limit(1);

		if (!conversation) throw ApiError.notFound('Conversation not found');
		conversationModel = conversation.defaultModel;
	}

	const model = input.model ?? conversationModel;
	await assertModelAccess(userId, model);

	const prepared = await db.transaction(async (tx) => {
		let conversationId = input.conversationId;
		let priorMessages: Array<{
			role: 'system' | 'user' | 'assistant' | 'tool';
			content: string;
		}> = [];

		if (conversationId) {
			const [conversation] = await tx
				.select({ id: conversationsTable.id })
				.from(conversationsTable)
				.where(
					and(
						eq(conversationsTable.id, conversationId),
						eq(conversationsTable.userId, userId),
					),
				)
				.limit(1);
			if (!conversation) throw ApiError.notFound('Conversation not found');

			priorMessages = await tx
				.select({ role: messagesTable.role, content: messagesTable.content })
				.from(messagesTable)
				.where(
					and(
						eq(messagesTable.conversationId, conversationId),
						eq(messagesTable.userId, userId),
					),
				)
				.orderBy(asc(messagesTable.createdAt), asc(messagesTable.id));
			priorMessages = priorMessages.filter((message) => message.role !== 'tool');

			if (input.model && input.model !== conversationModel) {
				await tx
					.update(conversationsTable)
					.set({ defaultModel: model })
					.where(eq(conversationsTable.id, conversationId));
			}
		} else {
			const [conversation] = await tx
				.insert(conversationsTable)
				.values({ userId, defaultModel: model })
				.returning({ id: conversationsTable.id });
			if (!conversation) throw ApiError.internal('Unable to create conversation');
			conversationId = conversation.id;
		}

		const [userMessage] = await tx
			.insert(messagesTable)
			.values({
				conversationId,
				userId,
				role: 'user',
				content: input.content,
				model,
			})
			.returning({ role: messagesTable.role, content: messagesTable.content });

		if (!userMessage) throw ApiError.internal('Unable to persist user message');

		await tx
			.update(conversationsTable)
			.set({ updatedAt: new Date() })
			.where(eq(conversationsTable.id, conversationId));

		return {
			conversationId,
			model,
			messages: buildGuardrailedChatPrompt([...priorMessages, userMessage]),
			quota,
		};
	});
	const promptBudget = prepared.messages.reduce(
		(sum, message) => sum + Buffer.byteLength(message.content, 'utf8') + 8,
		0,
	);
	const availableTokens =
		quota.monthlyTokenAllowance - quota.tokensUsedThisMonth - promptBudget;
	const maxCompletionTokens = Math.min(4096, availableTokens);
	if (maxCompletionTokens <= 0) {
		throw new ApiError(429, 'Monthly token quota exceeded. Upgrade to Pro to continue.', { code: 'MONTHLY_QUOTA_EXCEEDED', ...quota });
	}
	return { ...prepared, maxCompletionTokens };
};

export const finalizeAssistantCompletion = async (
	userId: string,
	input: RecordAssistantMessageInput,
) => {
	const promptTokens = input.promptTokens;
	const completionTokens = input.completionTokens;
	const totalTokens =
		input.totalTokens > 0 ? input.totalTokens : promptTokens + completionTokens;
	const db = getDb();
	await checkAndResetUserQuotas(userId);

	const message = await db.transaction(async (tx) => {
		const [updatedUser] = await tx
			.update(usersTable)
			.set({
				tokensUsedThisMonth: sql`${usersTable.tokensUsedThisMonth} + ${totalTokens}`,
			})
			.where(and(
				eq(usersTable.id, userId),
				sql`${usersTable.tokensUsedThisMonth} + ${totalTokens} <= ${usersTable.monthlyTokenAllowance}`,
			))
			.returning({
				monthlyTokenAllowance: usersTable.monthlyTokenAllowance,
				tokensUsedThisMonth: usersTable.tokensUsedThisMonth,
				lastMonthlyReset: usersTable.lastMonthlyReset,
			});
		if (!updatedUser) {
			const [existingUser] = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
			if (!existingUser) throw ApiError.notFound('User not found');
			throw new ApiError(429, 'Monthly token quota exceeded. Upgrade to Pro to continue.', { code: 'MONTHLY_QUOTA_EXCEEDED' });
		}

		const [conversation] = await tx
			.select({ id: conversationsTable.id })
			.from(conversationsTable)
			.where(
				and(
					eq(conversationsTable.id, input.conversationId),
					eq(conversationsTable.userId, userId),
				),
			)
			.limit(1);

		let assistantMessage: ChatMessage | undefined;
		if (conversation) {
			const [insertedMessage] = await tx
				.insert(messagesTable)
				.values({
					conversationId: input.conversationId,
					userId,
					role: 'assistant',
					content: input.content,
					model: input.model,
					promptTokens,
					completionTokens,
					totalTokens,
					metadata: input.metadata ?? undefined,
				})
				.returning();
			if (!insertedMessage) {
				throw ApiError.internal('Unable to persist assistant response');
			}
			assistantMessage = insertedMessage;

			await tx
				.update(conversationsTable)
				.set({ updatedAt: new Date() })
				.where(eq(conversationsTable.id, input.conversationId));
		}

		return {
			message: assistantMessage ?? null,
			quota: updatedUser,
		};
	});

	return message;
};
