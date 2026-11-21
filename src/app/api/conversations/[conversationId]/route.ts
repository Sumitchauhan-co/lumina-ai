import {
	deleteConversation,
	getConversationWithMessages,
	updateConversation,
} from '@/features/chat/services/chat.service';
import { updateConversationSchema } from '@/features/chat/models/chat.model';
import ApiError, { handleApiError } from '@/utils/apiError';
import { authenticate } from '@/utils/authenticate';
import ApiResponse from '@/utils/apiResponse';
import { validateBody } from '@/utils/validate';

const readConversationId = async (
	routeContext?: { params: Promise<Record<string, string>> },
) => {
	if (!routeContext) throw ApiError.badRequest('Conversation ID is required');
	const { conversationId } = await routeContext.params;
	return conversationId;
};

export const GET = authenticate(
	async (_request, { user }, routeContext) => {
		try {
			return ApiResponse.ok(
				'Conversation fetched successfully',
				await getConversationWithMessages(
					user.id,
					await readConversationId(routeContext),
				),
			);
		} catch (error) {
			return handleApiError(error);
		}
	},
);

export const PATCH = authenticate(
	async (request, { user }, routeContext) =>
		validateBody(updateConversationSchema)(request, async (input) => {
			try {
				return ApiResponse.ok(
					'Conversation updated successfully',
					await updateConversation(
						user.id,
						await readConversationId(routeContext),
						input,
					),
				);
			} catch (error) {
				return handleApiError(error);
			}
		}),
);

export const DELETE = authenticate(
	async (_request, { user }, routeContext) => {
		try {
			const deleted = await deleteConversation(
				user.id,
				await readConversationId(routeContext),
			);
			return ApiResponse.ok('Conversation deleted successfully', deleted);
		} catch (error) {
			return handleApiError(error);
		}
	},
);
