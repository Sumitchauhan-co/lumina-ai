import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
	getSharedAccessToken,
	notifyAuthSessionExpired,
	notifyAuthSessionRefreshed,
	setSharedAccessToken,
} from '@/utils/authSession';

const api = axios.create({
	withCredentials: true,
});

interface RefreshResult {
	accessToken: string;
	user: unknown;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const authEndpoints = [
	'/api/auth/signin',
	'/api/auth/signup',
	'/api/auth/refresh',
	'/api/auth/signout',
];
type RetryableConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };
let refreshInFlight: Promise<RefreshResult> | null = null;

const parseRefreshResponse = (value: unknown): RefreshResult => {
	const envelope = asRecord(value);
	const data = asRecord(envelope?.data) ?? envelope;
	const accessToken = data?.accessToken;

	if (typeof accessToken !== 'string' || !accessToken) {
		throw new Error('Refresh endpoint did not return an access token');
	}

	return {
		accessToken,
		user: data?.user,
	};
};

const refreshAccessToken = () => {
	if (!refreshInFlight) {
		const request = axios
			.post<unknown>('/api/auth/refresh', undefined, {
				withCredentials: true,
			})
			.then((response) => parseRefreshResponse(response.data));
		refreshInFlight = request.finally(() => {
			refreshInFlight = null;
		});
	}

	return refreshInFlight;
};

api.interceptors.request.use((config) => {
	if (typeof window === 'undefined') return config;

	const requestUrl = config.url ?? '';
	if (authEndpoints.some((endpoint) => requestUrl.includes(endpoint))) {
		return config;
	}

	const token = getSharedAccessToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

api.interceptors.response.use(
	(response) => response,
	async (error: unknown) => {
		if (!axios.isAxiosError(error)) return Promise.reject(error);

		const originalRequest = error.config as RetryableConfig | undefined;
		const requestUrl = originalRequest?.url ?? '';
		if (
			typeof window === 'undefined' ||
			error.response?.status !== 401 ||
			!originalRequest ||
			authEndpoints.some((endpoint) => requestUrl.includes(endpoint)) ||
			originalRequest._authRetry
		) {
			return Promise.reject(error);
		}

		originalRequest._authRetry = true;

		try {
			const refreshed = await refreshAccessToken();
			setSharedAccessToken(refreshed.accessToken);
			notifyAuthSessionRefreshed(refreshed.accessToken, refreshed.user);
			originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
			return api(originalRequest);
		} catch (refreshError) {
			setSharedAccessToken(null);
			notifyAuthSessionExpired();
			window.dispatchEvent(new Event('lumina:auth-expired'));
			return Promise.reject(refreshError);
		}
	},
);

export default api;
