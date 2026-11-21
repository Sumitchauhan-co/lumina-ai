import {
finalizeAssistantCompletion,
prepareChatCompletion,
} from '@/features/chat/services/chat.service';
import { sendMessageSchema } from '@/features/chat/models/chat.model';
import ApiError, { handleApiError } from '@/utils/apiError';
import { validateBody } from '@/utils/validate';
import { authenticate } from '@/utils/authenticate';
import axios from 'axios';
import { Readable } from 'node:stream';
import { NextResponse, type NextRequest } from 'next/server';

type Usage = {
	promptTokens?: number;
	completionTokens?: number;
	totalTokens?: number;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const tokenCount = (value: unknown): number | undefined =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
		? value
		: undefined;

const parseUsage = (value: unknown): Usage | undefined => {
	const record = asRecord(value);
	if (!record) return undefined;
	return {
		promptTokens: tokenCount(record.prompt_tokens),
		completionTokens: tokenCount(record.completion_tokens),
		totalTokens: tokenCount(record.total_tokens),
	};
};

const parseFrame = (frame: string): { content: string; usage?: Usage } => {
	const data = frame
		.split(/\r?\n/)
		.filter((line) => line.startsWith('data:'))
		.map((line) => line.slice(5).trim())
		.join('\n');
	if (!data || data === '[DONE]') return { content: '' };

	const payload = asRecord(JSON.parse(data) as unknown);
	if (!payload) throw new Error('OpenRouter returned an invalid stream frame');

	const choices = Array.isArray(payload.choices) ? payload.choices : [];
	const choice = asRecord(choices[0]);
	const delta = asRecord(choice?.delta);
	const rawContent = delta?.content;
	let content = '';

	if (typeof rawContent === 'string') {
		content = rawContent;
	} else if (Array.isArray(rawContent)) {
		content = rawContent
			.map((part) => asRecord(part)?.text)
			.filter((part): part is string => typeof part === 'string')
			.join('');
	}

	return { content, usage: parseUsage(payload.usage) };
};

const eventBytes = (encoder: TextEncoder, event: string, data: unknown) =>
	encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

const estimateTokens = (text: string) =>
	Math.max(1, Buffer.byteLength(text, 'utf8'));

export const POST = authenticate(async (request: NextRequest, { user }) => {
	return validateBody(sendMessageSchema)(request, async (input) => {
		try {
			const apiKey = process.env.OPENROUTER_API_KEY;
			if (!apiKey) throw ApiError.internal('OpenRouter is not configured');

			const prepared = await prepareChatCompletion(user.id, input);
			const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
			const response = await axios.post<Readable>(
				apiUrl,
				{
					model: prepared.model,
					messages: prepared.messages,
					max_tokens: prepared.maxCompletionTokens,
					stream: true,
					stream_options: { include_usage: true },
				},
				{
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json',
						'HTTP-Referer': process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000',
						'X-Title': 'Lumina AI',
					},
					responseType: 'stream',
					timeout: 300_000,
				},
			);

			const encoder = new TextEncoder();
			let cancelled = false;
			const stream = new ReadableStream<Uint8Array>({
				start(controller) {
					const run = async () => {
						let buffer = '';
						let assistantContent = '';
						let providerUsage: Usage | undefined;
						const decoder = new TextDecoder();
						const promptText = prepared.messages
							.map((message) => message.content)
							.join('\n');

						try {
							controller.enqueue(
								eventBytes(encoder, 'meta', {
									conversationId: prepared.conversationId,
									model: prepared.model,
									quota: prepared.quota,
								}),
							);

							const consumeFrame = (frame: string) => {
								const parsed = parseFrame(frame);
								if (parsed.usage) providerUsage = parsed.usage;
								if (parsed.content) {
									assistantContent += parsed.content;
									controller.enqueue(
										eventBytes(encoder, 'delta', {
											content: parsed.content,
										}),
									);
								}
							};

							for await (const chunk of response.data as AsyncIterable<unknown>) {
								if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) {
									throw new Error('OpenRouter returned an unsupported stream chunk');
								}
								buffer +=
									typeof chunk === 'string'
										? chunk
										: decoder.decode(chunk, { stream: true });

								let delimiter = buffer.search(/\r?\n\r?\n/);
								while (delimiter !== -1) {
									const separator = buffer.slice(delimiter).match(/^\r?\n\r?\n/);
									const frame = buffer.slice(0, delimiter);
									buffer = buffer.slice(delimiter + (separator?.[0].length ?? 2));
									consumeFrame(frame);
									delimiter = buffer.search(/\r?\n\r?\n/);
								}
							}

							buffer += decoder.decode();
							if (buffer.trim()) consumeFrame(buffer);
							if (!assistantContent.trim()) {
								throw new Error('OpenRouter completed without an assistant response');
							}

							const promptTokens =
								providerUsage?.promptTokens ??
								estimateTokens(promptText) + prepared.messages.length * 8;
							const completionTokens =
								providerUsage?.completionTokens ??
								estimateTokens(assistantContent);
							const totalTokens =
								providerUsage?.totalTokens ?? promptTokens + completionTokens;
							const finalized = await finalizeAssistantCompletion(user.id, {
								conversationId: prepared.conversationId,
								content: assistantContent,
								model: prepared.model,
								promptTokens,
								completionTokens,
								totalTokens,
							});

							if (!cancelled) {
								controller.enqueue(
									eventBytes(encoder, 'done', {
										usage: { promptTokens, completionTokens, totalTokens },
										quota: finalized.quota,
									}),
								);
								controller.close();
							}
						} catch (error) {
							console.error(
								'OpenRouter chat stream failed:',
								error instanceof Error ? error.message : 'Unknown stream error',
							);
							if (!cancelled) {
								controller.enqueue(
									eventBytes(encoder, 'error', {
									message: error instanceof Error ? error.message : 'The chat response could not be completed.',
									errors: error instanceof ApiError ? error.data : null,
									}),
								);
					controller.close();
							}
						} finally {
							if (!response.data.destroyed) response.data.destroy();
						}
					};

					void run();
				},
				cancel(reason) {
					cancelled = true;
					response.data.destroy(
						reason instanceof Error ? reason : undefined,
					);
				},
			});

			return new NextResponse(stream, {
				headers: {
					'Content-Type': 'text/event-stream; charset=utf-8',
					'Cache-Control': 'no-cache, no-transform',
					Connection: 'keep-alive',
				},
			});
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return handleApiError(
					new ApiError(502, 'OpenRouter request failed', {
						status: error.response?.status,
					}),
				);
			}
			return handleApiError(error);
		}
	});
});
