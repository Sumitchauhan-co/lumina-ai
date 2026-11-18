import { getUserService } from '@/features/auth/services/auth.service';
import { authenticate } from '@/utils/authenticate';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import type { NextRequest } from 'next/server';

export const GET = authenticate(async (req: NextRequest, context) => {
	try {
		const user = await getUserService(context.user.id);

		return ApiResponse.ok('User fetched successfully', user);
	} catch (error) {
		return handleApiError(error);
	}
});
