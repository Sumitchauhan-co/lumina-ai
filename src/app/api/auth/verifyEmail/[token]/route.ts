import { verifyEmailService } from '@/features/auth/services/auth.service';
import ApiError, { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';

type RouteContext = {
	params: Promise<{ token: string }>;
};

export const GET = async (_request: Request, context: RouteContext) => {
	try {
		const { token } = await context.params;

		if (!token) {
			throw ApiError.unauthorized('Invalid token');
		}

		await verifyEmailService(token);

		return ApiResponse.ok('Email verified successfully');
	} catch (error) {
		return handleApiError(error);
	}
};
