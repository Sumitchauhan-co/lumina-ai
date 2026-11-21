import { registerSchema } from '@/features/auth/models/auth.model';
import { cookieOptions, signupService } from '@/features/auth/services/auth.service';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { validateBody } from '@/utils/validate';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const POST = async (req: NextRequest) => {
	return validateBody(registerSchema)(req, async (data) => {
		try {
			const { user, accessToken, refreshToken } = await signupService(data);

			const cookieStore = await cookies();
			cookieStore.set('refreshToken', refreshToken, cookieOptions);

			return ApiResponse.created('Account created successfully', {
				user,
				accessToken,
			});
		} catch (error) {
			return handleApiError(error);
		}
	});
};
