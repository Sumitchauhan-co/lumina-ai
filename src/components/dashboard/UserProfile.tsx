'use client';

import { Loader2, LogIn, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/store';
import api from '@/utils/api';

interface UserProfileDropdownProps {
	onAfterNavigate?: () => void;
}

export function UserProfileDropdown({
	onAfterNavigate,
}: UserProfileDropdownProps) {
	const router = useRouter();
	const user = useAuthStore((s) => s.user);
	const isHydrated = useAuthStore((s) => s.isHydrated);
	const clearAuth = useAuthStore((s) => s.clearAuth);

	const [isSigningOut, setIsSigningOut] = useState(false);
	const [isMobileViewport, setIsMobileViewport] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia('(max-width: 1023px)');
		const handleChange = () => setIsMobileViewport(mediaQuery.matches);
		handleChange();
		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, []);

	const userDisplayName = !isHydrated
		? 'Loading...'
		: user
			? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
			: 'Account';

	const userEmail = user?.email ?? 'Not signed in';

	const userFirstLetter =
		[user?.firstName?.[0], user?.lastName?.[0]]
			.filter((initial): initial is string => Boolean(initial))
			.join('')
			.toUpperCase() || 'U';

	const handleSignout = async () => {
		if (isSigningOut) return;
		setIsSigningOut(true);
		try {
			await api.post('/api/auth/signout');
		} catch {
			// Clear local session even if the signout endpoint fails
		} finally {
			clearAuth();
			setIsSigningOut(false);
			onAfterNavigate?.();
			router.push('/sign-in');
		}
	};

	return (
		<div className="mt-auto border-t border-border bg-zinc-50/50 p-3 dark:bg-zinc-900/30">
			<DropdownMenu>
				<DropdownMenuTrigger
					disabled={isSigningOut}
					render={
						<button
							type="button"
							className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors duration-200 hover:bg-zinc-200/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-900/60"
						/>
					}
				>
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-zinc-900 text-sm font-semibold text-zinc-50 shadow-sm dark:bg-zinc-100 dark:text-zinc-950">
						{isSigningOut ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							userFirstLetter
						)}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-xs leading-none font-bold text-foreground">
							{userDisplayName}
						</p>
					</div>
				</DropdownMenuTrigger>

				<DropdownMenuContent
					side={isMobileViewport ? 'top' : 'right'}
					align="end"
					sideOffset={12}
					className="w-56 rounded-xl border-border/80 bg-popover/95 shadow-md backdrop-blur-md duration-150 animate-in fade-in-50 slide-in-from-bottom-1"
				>
					<DropdownMenuGroup>
						<DropdownMenuLabel className="p-3 font-normal">
							<div className="flex flex-col space-y-1">
								<p className="truncate text-xs leading-none font-bold text-foreground">
									{userDisplayName}
								</p>
								<p className="mt-0.5 truncate text-[10px] leading-none font-medium text-muted-foreground">
									{userEmail}
								</p>
							</div>
						</DropdownMenuLabel>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					{user ? (
						<DropdownMenuItem
							disabled={isSigningOut}
							onClick={() => void handleSignout()}
							className="cursor-pointer gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-destructive transition-colors focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20"
						>
							<LogOut className="h-3.5 w-3.5" />
							<span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem
							onClick={() => {
								onAfterNavigate?.();
								router.push('/sign-in');
							}}
							className="cursor-pointer gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
						>
							<LogIn className="h-3.5 w-3.5 text-muted-foreground" />
							<span>Sign in</span>
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
