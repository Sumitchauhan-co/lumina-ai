import { getUserQuotaStatus } from '@/features/chat/services/chat.service';
import { authenticate } from '@/utils/authenticate';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';

export const GET = authenticate(async (_request, { user }) => {
	try {
		return ApiResponse.ok(
			'Quota fetched successfully',
			await getUserQuotaStatus(user.id),
		);
	} catch (error) {
		return handleApiError(error);
	}
});
