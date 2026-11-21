import { getDb } from '@/db';
import { usersTable } from '@/db/auth.schema';
import ApiError, { handleApiError } from '@/utils/apiError';
import {
	type tokenPayload,
	hashRefreshToken,
	verifyAccessToken,
	verifyRefreshToken,
} from '@/utils/token';
import { and, eq, or } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

type NextRouteContext<T> = {
	params: Promise<T>;
};

export type AuthenticatedContext<T> = {
	user: tokenPayload;
	params: Promise<T>;
};

type AuthenticatedHandler<T> = (
	req: NextRequest,
	context: AuthenticatedContext<T>,
) => Promise<Response> | Response;

export const hasAuthenticatedSession = async (
	refreshToken: string,
): Promise<boolean> => {
	let decoded: Awaited<ReturnType<typeof verifyRefreshToken>>;

	try {
		decoded = await verifyRefreshToken(refreshToken);
	} catch (error) {
		if (
			error instanceof Error &&
			['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(
				error.name,
			)
		) {
			return false;
		}

		throw error;
	}

	if (
		typeof decoded !== 'object' ||
		decoded === null ||
		typeof decoded.id !== 'string'
	) {
		return false;
	}

	const [user] = await getDb()
		.select({ id: usersTable.id })
		.from(usersTable)
		.where(
			and(
				eq(usersTable.id, decoded.id),
				or(
					eq(usersTable.refreshToken, hashRefreshToken(refreshToken)),
					eq(usersTable.refreshToken, refreshToken),
				),
			),
		)
		.limit(1);

	return Boolean(user);
};

export const authenticate = <T>(handler: AuthenticatedHandler<T>) => {
	return async (req: NextRequest, nextJsContext: NextRouteContext<T>) => {
		try {
			const header = req.headers.get('authorization');

			if (!header || !header.startsWith('Bearer ')) {
				return handleApiError(
					ApiError.unauthorized('Invalid or missing authorization header'),
				);
			}

			const tokenParts = header.split(' ');
			const token = tokenParts[1];
			if (!token) {
				return handleApiError(
					ApiError.unauthorized('Not authorized for the action'),
				);
			}

			const decoded = await verifyAccessToken(token);

			const db = getDb();

			const [user] = await db
				.select({
					id: usersTable.id,
					role: usersTable.role,
				})
				.from(usersTable)
				.where(eq(usersTable.id, decoded.id));

			if (!user) {
				return handleApiError(ApiError.unauthorized('User no longer exists'));
			}

			return await handler(req, {
				params: nextJsContext.params,
				user: {
					id: user.id,
					role: user.role as 'user' | 'admin' | 'guest',
				},
			});
		} catch (error) {
			if (
				error instanceof Error &&
				['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(
					error.name,
				)
			) {
				return handleApiError(ApiError.unauthorized('Invalid or expired token'));
			}
			return handleApiError(error);
		}
	};
};
