import { forgotPasswordService } from '@/features/auth/services/auth.service';
import ApiError, { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import type { NextRequest } from 'next/server';

export const POST = async (req: NextRequest) => {
  try {
		const body: unknown = await req.json();
		const email =
			typeof body === 'object' && body !== null && 'email' in body
				? body.email
				: undefined;

		if (typeof email !== 'string' || !email) {
			throw ApiError.badRequest('Email is required');
		}

		await forgotPasswordService(email);

		return ApiResponse.ok('Email sent successfully to the existing account');
	} catch (error) {
		return handleApiError(error);
	}
};

