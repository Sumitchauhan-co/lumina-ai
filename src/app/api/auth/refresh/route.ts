import { cookieOptions, refreshService } from '@/features/auth/services/auth.service';
import ApiError, { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { cookies } from 'next/headers';

export const POST = async () => {
	const cookieStore = await cookies();
	try {
		const refreshToken = cookieStore.get('refreshToken')?.value;
		if (!refreshToken) {
			throw ApiError.unauthorized('Missing refresh token cookie');
		}

		const result = await refreshService(refreshToken);
		cookieStore.set('refreshToken', result.refreshToken, cookieOptions);

		return ApiResponse.ok('Token refreshed successfully', {
			accessToken: result.accessToken,
			user: result.user,
		});
	} catch (error) {
		if (error instanceof ApiError && error.statusCode === 401) {
			cookieStore.delete({ name: 'refreshToken', path: '/' });
		}
		return handleApiError(error);
	}
};
