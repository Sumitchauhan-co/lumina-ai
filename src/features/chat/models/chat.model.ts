import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { conversationsTable, messagesTable } from '@/db/chat.schema';

// ==================== ENUMS & TYPES ====================
export const messageRoles = ['system', 'user', 'assistant', 'tool'] as const;
export type MessageRole = (typeof messageRoles)[number];

// ==================== DRIZZLE-ZOD BASE SCHEMAS ====================
export const selectConversationSchema = createSelectSchema(conversationsTable);
export const insertConversationSchema = createInsertSchema(conversationsTable, {
	title: z.string().min(1, 'Title cannot be empty').max(255),
	defaultModel: z.string().min(1).max(120),
});

export const selectMessageSchema = createSelectSchema(messagesTable);
export const insertMessageSchema = createInsertSchema(messagesTable, {
	content: z.string().min(1, 'Message content cannot be empty'),
	model: z.string().max(120).optional().nullable(),
	promptTokens: z.number().int().min(0),
	completionTokens: z.number().int().min(0),
	totalTokens: z.number().int().min(0),
});

// ==================== API REQUEST VALIDATION SCHEMAS ====================

// 1. Create a new conversation
export const createConversationSchema = z.object({
	title: z.string().trim().min(1).max(255).optional(),
	defaultModel: z.string().trim().min(1).max(120).optional(),
});

// 2. Rename / update conversation settings
export const updateConversationSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(255).optional(),
	defaultModel: z.string().trim().min(1).max(120).optional(),
});

export const editMessageSchema = z.object({
	content: z.string().trim().min(1, 'Prompt cannot be empty').max(32000),
}).superRefine(({ content }, context) => {
	if (content.split(/\s+/u).filter(Boolean).length > 1_000) {
		context.addIssue({
			code: 'custom',
			message: 'A message can contain up to 1,000 words.',
			path: ['content'],
		});
	}
});

// 3. Send a chat message / trigger completion
export const sendMessageSchema = z.object({
	conversationId: z.string().uuid('Invalid conversation ID').optional(),
	content: z.string().trim().min(1, 'Prompt cannot be empty').max(32000),
	model: z.string().trim().min(1).max(120).optional(),
}).superRefine(({ content }, context) => {
	const wordCount = content.split(/\s+/u).filter(Boolean).length;
	if (wordCount > 1_000) {
		context.addIssue({
			code: 'custom',
			message: 'A message can contain up to 1,000 words.',
			path: ['content'],
		});
	}
});

// 4. Record assistant usage & persist response
export const recordAssistantMessageSchema = z.object({
	conversationId: z.string().uuid('Invalid conversation ID'),
	content: z.string().min(1),
	model: z.string().trim().min(1).max(120),
	promptTokens: z.number().int().min(0).default(0),
	completionTokens: z.number().int().min(0).default(0),
	totalTokens: z.number().int().min(0).default(0),
	metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ==================== TYPE EXPORTS ====================
export type Conversation = z.infer<typeof selectConversationSchema>;
export type NewConversation = z.infer<typeof insertConversationSchema>;
export type ChatMessage = z.infer<typeof selectMessageSchema>;
export type NewChatMessage = z.infer<typeof insertMessageSchema>;

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type RecordAssistantMessageInput = z.infer<
	typeof recordAssistantMessageSchema
>;
