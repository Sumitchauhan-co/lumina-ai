import { profileService } from '@/features/auth/services/auth.service';
import ApiError, { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import type { NextRequest } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = async (req: NextRequest, context: RouteContext) => {
  try {
		const { id } = await context.params;

		if (!id) {
			throw ApiError.notFound('Profile not found');
		}

		const user = await profileService(id);

		return ApiResponse.ok('User profile fetched successfully', { user });
	} catch (error) {
		return handleApiError(error);
	}
};

