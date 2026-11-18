import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { hasAuthenticatedSession } from './middlewares/authenticate';

export default async function proxy(request: NextRequest) {
	const refreshToken = request.cookies.get('refreshToken')?.value;
	const isAuthenticated = refreshToken
		? await hasAuthenticatedSession(refreshToken)
		: false;
	const pathname = request.nextUrl.pathname;
	const isAuthPage = pathname === '/sign-in' || pathname === '/sign-up';

	if (!isAuthenticated) {
		const response = isAuthPage
			? NextResponse.next()
			: NextResponse.redirect(new URL('/sign-in', request.url));

		if (refreshToken) {
			response.cookies.delete('refreshToken');
		}

		return response;
	}

	if (isAuthPage) {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/sign-in', '/sign-up', '/'],
};
