'use client';

import { useCompleteGoogleSignin } from '@/features/auth/hooks/auth';
import { useEffect, useRef } from 'react';

export default function GoogleSignInSuccess() {
	const { mutate: completeSignin } = useCompleteGoogleSignin();
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;
		completeSignin();
	}, [completeSignin]);

	return (
		<main
			className="flex min-h-screen items-center justify-center bg-[#09090b] text-zinc-400"
			aria-live="polite"
		>
			Completing Google sign-in…
		</main>
	);
}
