import ApiError, { handleApiError } from '@/utils/apiError';
import type { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';

type ValidatedHandler<T> = (data: T) => Promise<NextResponse>;

export const validateBody =
	<T>(schema: ZodType<T>) =>
	async (request: NextRequest, handler: ValidatedHandler<T>) => {
		let body: unknown;

		try {
			body = await request.json();
		} catch {
			return handleApiError(ApiError.badRequest('Invalid JSON body'));
		}

		const result = schema.safeParse(body);

		if (!result.success) {
			return handleApiError(
				ApiError.badRequest('Invalid request body', result.error.flatten()),
			);
		}

		return handler(result.data);
	};
