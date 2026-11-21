import {
	createConversation,
	listConversations,
} from '@/features/chat/services/chat.service';
import { createConversationSchema } from '@/features/chat/models/chat.model';
import { authenticate } from '@/utils/authenticate';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import { validateBody } from '@/utils/validate';

export const GET = authenticate(async (_request, { user }) => {
	try {
		return ApiResponse.ok(
			'Conversations fetched successfully',
			await listConversations(user.id),
		);
	} catch (error) {
		return handleApiError(error);
	}
});

export const POST = authenticate(async (request, { user }) =>
	validateBody(createConversationSchema)(request, async (input) => {
		try {
			return ApiResponse.created(
				'Conversation created successfully',
				await createConversation(user.id, input),
			);
		} catch (error) {
			return handleApiError(error);
		}
	}),
);
