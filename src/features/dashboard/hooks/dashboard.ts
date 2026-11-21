'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { deleteUserAccountAction, updateUserProfileAction } from '../actions';
import { useAuthStore } from '@/store/store';

export interface UpdateProfileInput {
	firstName: string;
	lastName?: string | null;
}

export function useUpdateProfile() {
	const user = useAuthStore((s) => s.user);
	const setUser = useAuthStore((s) => s.setUser);

	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const clearFeedback = useCallback(() => {
		setMessage(null);
		setError(null);
	}, []);

	const updateProfile = useCallback(
		async ({ firstName, lastName }: UpdateProfileInput) => {
			setMessage(null);
			setError(null);
			setIsSaving(true);

			try {
				const normalizedFirstName = firstName.trim();
				const normalizedLastName = lastName?.trim() || null;

				const result = await updateUserProfileAction({
					firstName: normalizedFirstName,
					lastName: normalizedLastName,
				});

				if (!result.ok) {
					const errMsg = result.error ?? 'Failed to update profile settings.';
					setError(errMsg);
					return { ok: false as const, error: errMsg };
				}

				const updated = result.data?.user;
				if (user) {
					setUser({
						...user,
						firstName: updated?.firstName ?? normalizedFirstName,
						lastName: updated?.lastName ?? normalizedLastName,
					});
				}

				const successMsg = 'Profile settings updated.';
				setMessage(successMsg);
				return { ok: true as const, message: successMsg };
			} catch {
				const errMsg = 'Failed to update profile settings.';
				setError(errMsg);
				return { ok: false as const, error: errMsg };
			} finally {
				setIsSaving(false);
			}
		},
		[setUser, user],
	);

	return {
		updateProfile,
		isSaving,
		message,
		error,
		clearFeedback,
	};
}

export function useDeleteAccount(redirectTo = '/sign-in') {
	const router = useRouter();
	const clearAuth = useAuthStore((s) => s.clearAuth);

	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const clearDeleteError = useCallback(() => {
		setDeleteError(null);
	}, []);

	const deleteAccount = useCallback(async () => {
		setDeleteError(null);
		setIsDeleting(true);

		try {
			const result = await deleteUserAccountAction();

			if (!result.ok) {
				const errMsg =
					result.error ?? 'Failed to delete account. Please try again.';
				setDeleteError(errMsg);
				return { ok: false as const, error: errMsg };
			}

			clearAuth();
			router.push(redirectTo);
			router.refresh();
			return { ok: true as const };
		} catch {
			const errMsg = 'Failed to delete account. Please try again.';
			setDeleteError(errMsg);
			return { ok: false as const, error: errMsg };
		} finally {
			setIsDeleting(false);
		}
	}, [clearAuth, redirectTo, router]);

	return {
		deleteAccount,
		isDeleting,
		deleteError,
		clearDeleteError,
	};
}
