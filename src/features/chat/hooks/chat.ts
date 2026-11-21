import axios from 'axios';
import {
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import api from '@/utils/api';

export interface ChatConversation {
	id: string;
	title: string;
	defaultModel: string;
	updatedAt: string;
}

export interface ChatMessageRecord {
	id: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	model: string | null;
	createdAt: string;
}

export interface ChatConversationDetails extends ChatConversation {
	messages: ChatMessageRecord[];
}

interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data: T;
}

export type ChatStreamEvent =
	| { type: 'meta'; conversationId: string; model: string }
	| { type: 'delta'; content: string }
	| { type: 'done'; usage?: { totalTokens?: number } }
	| { type: 'error'; message: string; code?: string };

export interface SendChatMessageInput {
	conversationId?: string;
	content: string;
	model: string;
	signal?: AbortSignal;
	onEvent: (event: ChatStreamEvent) => void;
}

export class ChatRequestError extends Error {
	code?: string;
	details: Record<string, unknown> | null;

	constructor(
		message: string,
		code?: string,
		details: Record<string, unknown> | null = null,
	) {
		super(message);
		this.name = 'ChatRequestError';
		this.code = code;
		this.details = details;
	}
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const errorFrom = (error: unknown): ChatRequestError => {
	if (error instanceof ChatRequestError) return error;
	if (!axios.isAxiosError(error)) {
		return new ChatRequestError(
			error instanceof Error ? error.message : 'The chat request failed.',
		);
	}

	let payload: unknown = error.response?.data;
	if (typeof payload === 'string') {
		try {
			payload = JSON.parse(payload) as unknown;
		} catch {
			payload = null;
		}
	}
	const record = asRecord(payload);
	const details = asRecord(record?.errors);
	return new ChatRequestError(
		typeof record?.message === 'string'
			? record.message
			: 'The chat request failed. Please try again.',
		typeof details?.code === 'string' ? details.code : undefined,
		details,
	);
};

const conversationKeys = {
	all: ['chat', 'conversations'] as const,
	detail: (id: string) => ['chat', 'conversation', id] as const,
};

export function useConversations(enabled = true) {
	return useQuery({
		queryKey: conversationKeys.all,
		enabled,
		queryFn: async () => {
			const response = await api.get<ApiEnvelope<ChatConversation[]>>(
				'/api/conversations',
			);
			return Array.isArray(response.data?.data) ? response.data.data : [];
		},
	});
}

export function useConversation(conversationId: string | null) {
	return useQuery({
		queryKey: conversationKeys.detail(conversationId ?? ''),
		enabled: Boolean(conversationId),
		queryFn: async () => {
			if (!conversationId) return null;
			const response = await api.get<ApiEnvelope<ChatConversationDetails>>(
				`/api/conversations/${conversationId}`,
			);
			return response.data?.data ?? null;
		},
	});
}

export function useCreateConversation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: { title?: string; defaultModel?: string }) => {
			const response = await api.post<ApiEnvelope<ChatConversation>>(
				'/api/conversations',
				input,
			);
			return response.data.data;
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
	});
}

export function useRenameConversation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: { conversationId: string; title: string }) => {
			const response = await api.patch<ApiEnvelope<ChatConversation>>(
				`/api/conversations/${input.conversationId}`,
				{ title: input.title },
			);
			return response.data.data;
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
	});
}

export function useEditChatMessage() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			conversationId: string;
			messageId: string;
			content: string;
		}) => {
			const response = await api.patch<
				ApiEnvelope<{
					prompt: { id: string; content: string };
					deletedMessageIds: string[];
				}>
			>(
				`/api/conversations/${input.conversationId}/messages/${input.messageId}`,
				{ content: input.content },
			);
			return response.data.data;
		},
		onSuccess: async (_result, input) => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: conversationKeys.detail(input.conversationId),
				}),
				queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
			]);
		},
	});
}

export function useDeleteConversation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (conversationId: string) => {
			await api.delete(`/api/conversations/${conversationId}`);
			return conversationId;
		},
		onSuccess: async (conversationId) => {
			queryClient.removeQueries({
				queryKey: conversationKeys.detail(conversationId),
			});
			await queryClient.invalidateQueries({ queryKey: conversationKeys.all });
		},
	});
}

const parseSseFrame = (frame: string): ChatStreamEvent | null => {
	const eventType = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
	const data = frame
		.split(/\r?\n/)
		.filter((line) => line.startsWith('data:'))
		.map((line) => line.slice(5).trim())
		.join('\n');
	if (!data || data === '[DONE]') return null;
	const payload = asRecord(JSON.parse(data) as unknown);
	if (!payload) return null;

	if (eventType === 'meta' && typeof payload.conversationId === 'string') {
		return {
			type: 'meta',
			conversationId: payload.conversationId,
			model: typeof payload.model === 'string' ? payload.model : '',
		};
	}
	if (eventType === 'delta' && typeof payload.content === 'string') {
		return { type: 'delta', content: payload.content };
	}
	if (eventType === 'done') {
		const usage = asRecord(payload.usage);
		return {
			type: 'done',
			usage:
				typeof usage?.totalTokens === 'number'
					? { totalTokens: usage.totalTokens }
					: undefined,
		};
	}
	if (eventType === 'error') {
		const details = asRecord(payload.errors);
		return {
			type: 'error',
			message:
				typeof payload.message === 'string'
					? payload.message
					: 'The chat response could not be completed.',
			code: typeof details?.code === 'string' ? details.code : undefined,
		};
	}
	return null;
};

export function useSendChatMessage() {
	return useMutation({
		mutationFn: async (input: SendChatMessageInput) => {
			let consumedTextLength = 0;
			let buffer = '';
			let streamFailure: ChatRequestError | null = null;
			const consume = (text: string, flush = false) => {
				const freshText = text.slice(consumedTextLength);
				consumedTextLength = text.length;
				buffer += freshText;
				let delimiter = buffer.search(/\r?\n\r?\n/);
				while (delimiter !== -1) {
					const separator = buffer.slice(delimiter).match(/^\r?\n\r?\n/);
					const frame = buffer.slice(0, delimiter);
					buffer = buffer.slice(delimiter + (separator?.[0].length ?? 2));
					try {
						const event = parseSseFrame(frame);
						if (event?.type === 'error') {
						streamFailure = new ChatRequestError(
							event.message,
							event.code,
						);
						input.onEvent(event);
					} else if (event) {
						input.onEvent(event);
					}
					} catch (error) {
						streamFailure = errorFrom(error);
					}
					delimiter = buffer.search(/\r?\n\r?\n/);
				}
				if (flush && buffer.trim()) {
					try {
						const event = parseSseFrame(buffer);
						if (event?.type === 'error') {
							streamFailure = new ChatRequestError(event.message, event.code);
							input.onEvent(event);
						} else if (event) input.onEvent(event);
					} catch (error) {
						streamFailure = errorFrom(error);
					}
					buffer = '';
				}
			};

			try {
				const response = await api.post<string>(
					'/api/chat',
					{
						...(input.conversationId
							? { conversationId: input.conversationId }
							: {}),
						content: input.content,
						model: input.model,
					},
					{
						responseType: 'text',
						signal: input.signal,
						onDownloadProgress: (progress) => {
							const xhr = progress.event?.currentTarget;
							if (
								typeof XMLHttpRequest !== 'undefined' &&
								xhr instanceof XMLHttpRequest &&
								typeof xhr.responseText === 'string'
							) {
								consume(xhr.responseText);
							}
						},
					},
				);
				consume(response.data, true);
			} catch (error) {
				throw streamFailure ?? errorFrom(error);
			}
			if (streamFailure) throw streamFailure;
			return true;
		},
	});
}
