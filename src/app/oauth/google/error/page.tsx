import Link from 'next/link';

export default function GoogleSignInErrorPage() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
			<section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
				<h1 className="text-xl font-semibold text-foreground dark:text-white">
					Google sign-in failed
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Please try again, or use another sign-in method.
				</p>
				<Link
					href="/sign-in"
					className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-muted"
				>
					Return to sign in
				</Link>
			</section>
		</main>
	);
}
