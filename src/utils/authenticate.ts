import ApiError, { handleApiError } from '@/utils/apiError';
import { verifyAccessToken, type tokenPayload } from '@/utils/token';
import type { NextRequest, NextResponse } from 'next/server';

interface AuthContext {
	user: tokenPayload;
}

interface RouteContext {
	params: Promise<Record<string, string>>;
}

type AuthenticatedHandler = (
	request: NextRequest,
	context: AuthContext,
	routeContext?: RouteContext,
) => Promise<NextResponse>;

export const authenticate =
	(handler: AuthenticatedHandler) =>
	async (request: NextRequest, routeContext?: RouteContext) => {
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

			// Preserve App Router params for authenticated dynamic route handlers.
			return handler(request, { user: decoded }, routeContext);
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
