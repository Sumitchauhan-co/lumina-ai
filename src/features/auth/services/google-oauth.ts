export const googleOAuthStateCookie = 'googleOAuthState';

export const getGoogleOAuthConfig = () => {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error('Google OAuth credentials are not configured.');
	}

	return {
		clientId,
		clientSecret,
		redirectUri:
			process.env.GOOGLE_REDIRECT_URI ||
			'http://localhost:3000/api/auth/google/callback',
	};
};
