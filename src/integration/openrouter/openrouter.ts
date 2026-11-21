import { OpenRouter } from '@openrouter/sdk';

const client = new OpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY ?? '',
	httpReferer: process.env.NEXT_PUBLIC_URL,
	appTitle: 'Lumina AI',
});

export const ALLOWED_MODELS = {
	freeFast: 'openai/gpt-4o-mini',
	proOmni: 'openai/gpt-4o',
	proBalanced: 'anthropic/claude-3.5-haiku',
	proReasoning: 'google/gemini-2.5-flash',
} as const;

export type AllowedModelId =
	(typeof ALLOWED_MODELS)[keyof typeof ALLOWED_MODELS];

export async function generateChatReply(params: {
	model: AllowedModelId;
	input: string;
}) {
	const response = await client.responses.send({
		responsesRequest: {
			model: params.model,
			input: params.input,
		},
	});

	if (!('output' in response)) {
		throw new Error('Expected a non-streaming response');
	}

	if (response.status !== 'completed') {
		throw new Error(
			response.error?.message ?? `Response ended as ${response.status}`,
		);
	}

	const message = response.output.find((item) => item.type === 'message');
	return (
		message?.content.find((part) => part.type === 'output_text')?.text ?? ''
	);
}
