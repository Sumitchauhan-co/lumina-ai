import { signoutService } from '@/features/auth/services/auth.service';
import { authenticate } from '@/utils/authenticate';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const POST = authenticate(async (req: NextRequest, context) => {
	try {
		await signoutService(context.user);

		const cookieStore = await cookies();
		cookieStore.delete({
			name: 'refreshToken',
			path: '/',
		});

		return ApiResponse.ok('Signed out successfully');
	} catch (error) {
		return handleApiError(error);
	}
});
