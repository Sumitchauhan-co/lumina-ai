import { signoutService } from '@/features/auth/services/auth.service';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { cookies } from 'next/headers';

export const POST = async () => {
	const cookieStore = await cookies();
	const refreshToken = cookieStore.get('refreshToken')?.value;

	try {
		await signoutService(refreshToken);
		cookieStore.delete({ name: 'refreshToken', path: '/' });
		return ApiResponse.ok('Signed out successfully');
	} catch (error) {
		cookieStore.delete({ name: 'refreshToken', path: '/' });
		return handleApiError(error);
	}
};
