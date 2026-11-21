import { getBillingStatus } from '@/features/subscription/services/subscription.service';
import { authenticate } from '@/utils/authenticate';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';

export const GET = authenticate(async (_request, { user }) => {
	try {
		return ApiResponse.ok(
			'Billing status fetched successfully',
			await getBillingStatus(user.id),
		);
	} catch (error) {
		return handleApiError(error);
	}
});
