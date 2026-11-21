import { createSubscriptionCheckoutSchema } from '@/features/subscription/models/subscription.model';
import { createSubscriptionCheckout } from '@/features/subscription/services/subscription.service';
import { authenticate } from '@/utils/authenticate';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { validateBody } from '@/utils/validate';

export const POST = authenticate(async (request, { user }) =>
	validateBody(createSubscriptionCheckoutSchema)(request, async (input) => {
		try {
			return ApiResponse.created(
				'Subscription checkout created successfully',
				await createSubscriptionCheckout(user.id, input),
			);
		} catch (error) {
			return handleApiError(error);
		}
	}),
);
