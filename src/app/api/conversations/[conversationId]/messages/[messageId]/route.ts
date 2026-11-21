import { editConversationPrompt } from '@/features/chat/services/chat.service';
import { editMessageSchema } from '@/features/chat/models/chat.model';
import ApiError, { handleApiError } from '@/utils/apiError';
import { authenticate } from '@/utils/authenticate';
import ApiResponse from '@/utils/apiResponse';
import { validateBody } from '@/utils/validate';

export const PATCH = authenticate(
	async (request, { user }, routeContext) =>
		validateBody(editMessageSchema)(request, async (input) => {
			try {
				if (!routeContext) {
					throw ApiError.badRequest('Conversation and message IDs are required');
				}
				const { conversationId, messageId } = await routeContext.params;
				return ApiResponse.ok(
					'Prompt updated successfully',
					await editConversationPrompt(
						user.id,
						conversationId,
						messageId,
						input,
					),
				);
			} catch (error) {
				return handleApiError(error);
			}
		}),
);
