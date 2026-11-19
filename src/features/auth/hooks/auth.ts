import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';

import { setAccessToken, useAuthStore } from '@/store/store';
import api from '@/utils/api';

interface User {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
}

export const authKeys = {
	user: ['user'] as const,
};

export function useUser() {
	const { clearAuth, setAuthenticated } = useAuthStore();

	return useQuery<User | null>({
		queryKey: authKeys.user,
		queryFn: async () => {
			try {
				const response = await api.get('/api/auth/get-user');
				const result = response.data?.data;

				if (result) {
					setAuthenticated(true);
					return result;
				}

				clearAuth();
				return null;
			} catch (error) {
				clearAuth();
				console.log(error);
				return null;
			}
		},
		enabled: true,
		retry: false,
		staleTime: 1000 * 60 * 5,
	});
}

export function useUserProfile(userId?: string) {
	return useQuery<User | null>({
		queryKey: [...authKeys.user, userId],
		queryFn: async () => {
			if (!userId) return null;

			try {
				const response = await api.get(`/api/auth/profile/${userId}`);
				const result = response.data?.data?.user;

				if (result) {
					return result;
				}

				return null;
			} catch (error) {
				console.error(error);
				return null;
			}
		},
		retry: false,
		staleTime: 1000 * 60 * 5,
	});
}

export function useSignin() {
	const queryClient = useQueryClient();
	const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
	const router = useRouter();

	return useMutation({
		mutationFn: async (credentials: Record<string, string>) => {
			const toastId = toast.loading('Verifying credentials...');

			try {
				const res = await api.post('/api/auth/signin', credentials);
				return { ...res.data, toastId };
			} catch (error) {
				let errorMessage = 'Authentication failed';
				if (isAxiosError(error)) {
					errorMessage = error.response?.data?.message || errorMessage;
				}

				toast.error(errorMessage, { id: toastId });
				throw new Error(errorMessage, { cause: error });
			}
		},
		onSuccess: (res) => {
			const token = res?.data?.accessToken;
			const userData = res?.data?.user;
			const toastId = res?.toastId;

			if (token) setAccessToken(token);
			setAuthenticated(true);
			queryClient.setQueryData(authKeys.user, userData);

			const userFirstName = userData?.firstName || 'User';

			toast.success(`Welcome back, ${userFirstName}!`, {
				id: toastId,
				description: "You've signed in to Lumina AI successfully.",
				duration: 10000,
				action: {
					label: 'Go to Workspace',
					onClick: () => router.push('/'),
				},
			});
		},
	});
}

export function useCompleteSocialSignin() {
	const queryClient = useQueryClient();
	const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
	const setSubscriptionDetails = useAuthStore(
		(state) => state.setSubscriptionDetails,
	);
	const clearAuth = useAuthStore((state) => state.clearAuth);
	const router = useRouter();

	return useMutation({
		mutationFn: async () => {
			const response = await api.post<{
				data: {
					accessToken: string;
					user: {
						planType: 'free' | 'pro';
						passStatus: 'inactive' | 'active' | 'expired';
						monthlyTokenAllowance: number;
						tokensUsedThisMonth: number;
						tokensUsedToday: number;
					};
				};
			}>('/api/auth/refresh');

			return response.data.data;
		},
		onSuccess: ({ accessToken, user }) => {
			setAccessToken(accessToken);
			setAuthenticated(true, accessToken);
			setSubscriptionDetails({
				planType: user.planType,
				passStatus: user.passStatus,
				monthlyTokenAllowance: user.monthlyTokenAllowance,
				tokensUsedThisMonth: user.tokensUsedThisMonth,
				tokensUsedToday: user.tokensUsedToday,
			});
			queryClient.setQueryData(authKeys.user, user);
			router.replace('/');
		},
		onError: () => {
			clearAuth();
			router.replace('/sign-in');
		},
	});
}

export function useSignup() {
	const queryClient = useQueryClient();
	const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
	const router = useRouter();

	return useMutation({
		mutationFn: async (formData: Record<string, string>) => {
			const toastId = toast.loading('Creating your account...');

			try {
				const res = await api.post('/api/auth/signup', formData);
				return { ...res.data, toastId };
			} catch (error) {
				let errorMessage = 'Registration failed. Try again.';
				if (isAxiosError(error)) {
					errorMessage = error.response?.data?.message || errorMessage;
				}

				toast.error(errorMessage, { id: toastId });
				throw new Error(errorMessage, { cause: error });
			}
		},
		onSuccess: (res) => {
			const token = res?.data?.accessToken;
			const userData = res?.data?.user;
			const toastId = res?.toastId;

			if (token) setAccessToken(token);
			setAuthenticated(true);

			if (userData) {
				queryClient.setQueryData(authKeys.user, userData);
			}

			toast.success('Welcome to Lumina AI!', {
				id: toastId,
				description: 'Your AI workspace profile is ready.',
				duration: 10000,
				action: {
					label: 'Go to Workspace',
					onClick: () => router.push('/'),
				},
			});
		},
	});
}

export function useSignout() {
	const queryClient = useQueryClient();
	const clearAuth = useAuthStore((state) => state.clearAuth);
	const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
	const router = useRouter();

	return useMutation({
		mutationFn: async () => {
			const toastId = toast.loading('Signing out...');

			try {
				await api.post('/api/auth/signout');
				return { toastId };
			} catch (error) {
				let errorMessage = 'Sign out failed. Please try again.';
				if (isAxiosError(error)) {
					errorMessage = error.response?.data?.message || errorMessage;
				}

				toast.error(errorMessage, { id: toastId });
				throw new Error(errorMessage, { cause: error });
			}
		},
		onSuccess: (data) => {
			const toastId = data?.toastId;

			clearAuth();
			setAuthenticated(false);

			queryClient.setQueryData(authKeys.user, null);
			queryClient.removeQueries();

			toast.success('Signed out!', {
				id: toastId,
				description: 'You have successfully signed out.',
				duration: 5000,
				action: {
					label: 'Go to Sign in',
					onClick: () => router.push('/sign-in'),
				},
			});
		},
	});
}

export function useForgotPassword() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: Record<string, string>) => {
			const toastId = toast.loading('Sending reset link...');

			try {
				await api.post('/api/auth/forgot-password', data);
				return { toastId };
			} catch (error) {
				let errorMessage = 'Failed to send email. Please try again later.';
				if (isAxiosError(error)) {
					errorMessage = error.response?.data?.message || errorMessage;
				}

				toast.error(errorMessage, { id: toastId });
				throw new Error(errorMessage, { cause: error });
			}
		},
		onSuccess: (data) => {
			const toastId = data?.toastId;

			queryClient.setQueryData(authKeys.user, null);
			queryClient.removeQueries();

			toast.success('Email sent successfully!', {
				id: toastId,
				description: 'A secure reset link has been sent to your email.',
				duration: 5000,
				action: {
					label: 'Okay',
					onClick: () => {},
				},
			});
		},
	});
}

export function useResetPassword() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: Record<string, string>) => {
			const toastId = toast.loading('Updating password...');

			try {
				await api.post(`/api/auth/reset-password?token=${data.token}`, data);
				return { toastId };
			} catch (error) {
				let errorMessage = 'Failed to update. Please try again.';
				if (isAxiosError(error)) {
					errorMessage = error.response?.data?.message || errorMessage;
				}

				toast.error(errorMessage, { id: toastId });
				throw new Error(errorMessage, { cause: error });
			}
		},
		onSuccess: (data) => {
			const toastId = data?.toastId;

			queryClient.setQueryData(authKeys.user, null);
			queryClient.removeQueries();

			toast.success('Password updated!', {
				id: toastId,
				description: 'Your new password has been successfully saved.',
				duration: 5000,
				action: {
					label: 'Okay',
					onClick: () => {},
				},
			});
		},
	});
}
