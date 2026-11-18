import { cookieOptions, refreshService } from '@/features/auth/services/auth.service';
import ApiError, { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { cookies } from 'next/headers';

export const POST = async () => {
	try {
		const cookieStore = await cookies();
		const cookieObject = cookieStore.get('refreshToken');

		const currentRefreshToken = cookieObject?.value;

		if (!currentRefreshToken) {
			throw ApiError.unauthorized('Invalid or expired token');
		}

		const { accessToken, user } = await refreshService(currentRefreshToken);

		if (!user) {
			throw ApiError.notFound('User not found');
		}

		if (!user.refreshToken) {
			throw ApiError.internal('Missing refresh token from user data');
		}

		const { refreshToken, ...safeUser } = user;
		cookieStore.set('refreshToken', refreshToken, cookieOptions);

		return ApiResponse.ok('Token refreshed successfully', {
			accessToken,
			user: safeUser,
		});
	} catch (error) {
		return handleApiError(error);
	}
};

