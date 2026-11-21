import { handleRazorpayWebhook } from '@/features/subscription/services/subscription.service';
import { handleApiError } from '@/utils/apiError';
import ApiResponse from '@/utils/apiResponse';
import type { NextRequest } from 'next/server';

export const POST = async (request: NextRequest) => {
	try {
		const rawBody = await request.text();
		const signature = request.headers.get('x-razorpay-signature') ?? '';
		const eventId = request.headers.get('x-razorpay-event-id');
		const result = await handleRazorpayWebhook(rawBody, signature, eventId);
		return ApiResponse.ok('Razorpay webhook processed successfully', result);
	} catch (error) {
		return handleApiError(error);
	}
};
