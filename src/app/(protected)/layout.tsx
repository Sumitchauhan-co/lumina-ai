'use client';

import api from '@/utils/api';
import {
	type SubscriptionDetails,
	type UserProfile,
	useAuthStore,
} from '@/store/store';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type RefreshedUser = UserProfile & SubscriptionDetails;

export default function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const isHydrated = useAuthStore((state) => state.isHydrated);
	const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
	const setSubscriptionDetails = useAuthStore(
		(state) => state.setSubscriptionDetails,
	);
	const clearAuth = useAuthStore((state) => state.clearAuth);
	const [isCheckingSession, setIsCheckingSession] = useState(true);
	const checkStarted = useRef(false);

	useEffect(() => {
		const handleExpiredSession = () => {
			clearAuth();
			router.replace('/sign-in');
		};

		window.addEventListener('lumina:auth-expired', handleExpiredSession);
		return () =>
			window.removeEventListener('lumina:auth-expired', handleExpiredSession);
	}, [clearAuth, router]);

	useEffect(() => {
		if (!isHydrated || checkStarted.current) return;
		checkStarted.current = true;

		let cancelled = false;

		api
			.post<{ data: { accessToken: string; user: RefreshedUser } }>(
				'/api/auth/refresh',
			)
			.then(({ data }) => {
				if (cancelled) return;

				const { accessToken, user } = data.data;
				setAuthenticated(true, accessToken, user);
				setSubscriptionDetails({
					planType: user.planType,
					passStatus: user.passStatus,
					monthlyTokenAllowance: user.monthlyTokenAllowance,
					tokensUsedThisMonth: user.tokensUsedThisMonth,
				});
				setIsCheckingSession(false);
			})
			.catch(() => {
				if (cancelled) return;

				clearAuth();
				router.replace('/sign-in');
			});

		return () => {
			cancelled = true;
		};
	}, [
		clearAuth,
		isHydrated,
		router,
		setAuthenticated,
		setSubscriptionDetails,
	]);

	return (
		<>
			<main
				hidden={!isCheckingSession}
				className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
				aria-live="polite"
			>
				Checking your session…
			</main>
			<div hidden={isCheckingSession}>{children}</div>
		</>
	);
}
