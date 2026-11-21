'use client';

import { useCompleteSocialSignin } from '@/features/auth/hooks/auth';
import { useEffect, useRef } from 'react';

export default function SocialSignInSuccess() {
	const { mutate: completeSignin } = useCompleteSocialSignin();
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;
		completeSignin();
	}, [completeSignin]);

	return (
		<main
			className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
			aria-live="polite"
		>
			Completing Google sign-in…
		</main>
	);
}
