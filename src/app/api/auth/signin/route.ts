import { loginSchema } from '@/features/auth/models/auth.model';
import { cookieOptions, signinService } from '@/features/auth/services/auth.service';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { validateBody } from '@/utils/validate';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const POST = async (req: NextRequest) => {
	return validateBody(loginSchema)(req, async (data) => {
		try {
			const { user, accessToken, refreshToken } = await signinService(data);

			const cookieStore = await cookies();
			cookieStore.set('refreshToken', refreshToken, cookieOptions);

			return ApiResponse.ok('Signed in successfully', {
				user,
				accessToken,
			});
		} catch (error) {
			return handleApiError(error);
		}
	});
};

