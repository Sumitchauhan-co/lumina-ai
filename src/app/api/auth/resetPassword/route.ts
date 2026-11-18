import { resetPasswordService } from '@/features/auth/services/auth.service';
import ApiError, { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import type { NextRequest } from 'next/server';

export const POST = async (req: NextRequest) => {
  try {
		const { searchParams } = new URL(req.url);
		const token = searchParams.get('token');

		if (!token) {
			throw ApiError.unauthorized('Invalid or missing token');
		}

		const body = await req.json();
		const { newPassword, confirmPassword } = body;

		if (!newPassword || !confirmPassword) {
			throw ApiError.badRequest('Passwords are required');
		}

		if (newPassword !== confirmPassword) {
			throw ApiError.badRequest('Passwords do not match');
		}

		await resetPasswordService({ token, newPassword });

		return ApiResponse.ok('Password reset successfully');
	} catch (error) {
		return handleApiError(error);
	}
};

