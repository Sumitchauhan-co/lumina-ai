import Link from 'next/link';

export default function GitHubSignInErrorPage() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-zinc-100">
			<section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
				<h1 className="text-xl font-semibold text-white">
					GitHub sign-in failed
				</h1>
				<p className="mt-2 text-sm text-zinc-400">
					Please try again, or use another sign-in method.
				</p>
				<Link
					href="/sign-in"
					className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
				>
					Return to sign in
				</Link>
			</section>
		</main>
	);
}
