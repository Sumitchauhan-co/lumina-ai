import ApiError, { handleApiError } from '@/utils/apiError';
import { verifyAccessToken, type tokenPayload } from '@/utils/token';
import type { NextRequest, NextResponse } from 'next/server';

interface AuthContext {
	user: tokenPayload;
}

type AuthenticatedHandler = (
	request: NextRequest,
	context: AuthContext,
) => Promise<NextResponse>;

export const authenticate =
	(handler: AuthenticatedHandler) => async (request: NextRequest) => {
		const authorization = request.headers.get('authorization');
		const [scheme, token] = authorization?.split(' ') ?? [];

		if (scheme?.toLowerCase() !== 'bearer' || !token) {
			return handleApiError(ApiError.unauthorized('Unauthorized access'));
		}

		try {
			const decoded = await verifyAccessToken(token);

			if (
				typeof decoded === 'string' ||
				typeof decoded.id !== 'string' ||
				!['user', 'admin', 'guest'].includes(decoded.role)
			) {
				return handleApiError(ApiError.unauthorized('Invalid access token'));
			}

			return handler(request, {
				user: { id: decoded.id, role: decoded.role as tokenPayload['role'] },
			});
		} catch (error) {
			if (
				error instanceof Error &&
				(error.name === 'JsonWebTokenError' ||
					error.name === 'TokenExpiredError' ||
					error.name === 'NotBeforeError')
			) {
				return handleApiError(ApiError.unauthorized('Invalid access token'));
			}

			throw error;
		}
	};
