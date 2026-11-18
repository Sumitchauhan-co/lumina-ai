import { loginSchema } from '@/features/auth/models/auth.model';
import { cookieOptions, signinService } from '@/features/auth/services/auth.service';
import ApiError, { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { validateBody } from '@/utils/validate';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const POST = async (req: NextRequest) => {
	return validateBody(loginSchema)(req, async (data) => {
		try {
			const { user, accessToken } = await signinService(data);

			if (!user.refreshToken) {
				throw ApiError.internal('Missing refresh token from user data');
			}

			const cookieStore = await cookies();
			const { refreshToken, ...safeUser } = user;
			cookieStore.set('refreshToken', refreshToken, cookieOptions);

			return ApiResponse.ok('Signed in successfully', {
				user: safeUser,
				accessToken,
			});
		} catch (error) {
			return handleApiError(error);
		}
	});
};

