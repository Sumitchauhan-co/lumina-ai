import { cancelSubscriptionSchema } from '@/features/subscription/models/subscription.model';
import { cancelUserSubscription } from '@/features/subscription/services/subscription.service';
import { authenticate } from '@/utils/authenticate';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { validateBody } from '@/utils/validate';

export const POST = authenticate(async (request, { user }) =>
	validateBody(cancelSubscriptionSchema)(request, async (input) => {
		try {
			return ApiResponse.ok(
				'Subscription cancellation updated successfully',
				await cancelUserSubscription(user.id, input),
			);
		} catch (error) {
			return handleApiError(error);
		}
	}),
);
