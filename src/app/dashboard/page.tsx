'use client';

import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useAuthStore } from '@/store/store';
import { useDashboardBilling } from '@/features/dashboard/hooks/useDashboardBilling';

function formatTokens(value: number): string {
	return value.toLocaleString('en-US');
}

export default function DashboardPage() {
	useDashboardBilling();
	const router = useRouter();
	const user = useAuthStore((s) => s.user);
	const planType = useAuthStore((s) => s.planType);

	const passStatus = useAuthStore((s) => s.passStatus);

	const monthlyTokenAllowance = useAuthStore((s) => s.monthlyTokenAllowance);

	const tokensUsedThisMonth = useAuthStore((s) => s.tokensUsedThisMonth);
	const isHydrated = useAuthStore((s) => s.isHydrated);

	const hasProAccess = planType === 'pro' && passStatus === 'active';

	const displayedAllowance = hasProAccess ? monthlyTokenAllowance : 1_000;

	const remainingTokens = Math.max(0, displayedAllowance - tokensUsedThisMonth);

	return (
		<DashboardShell title="Overview">
			<div className="mx-auto max-w-6xl space-y-6">
				<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
					<div>
						<h2 className="text-2xl font-bold tracking-tight">
							Welcome back
							{isHydrated && user?.firstName ? `, ${user.firstName}` : ''}
						</h2>
						<p className="text-sm text-muted-foreground">
							Manage your AI workspace, subscription plan, and account details.
						</p>
					</div>
					<Button
						onClick={() => router.push('/')}
						className="inline-flex cursor-pointer items-center gap-2"
					>
						<MessageSquare className="h-4 w-4" />
						<span>Open Chat</span>
					</Button>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardHeader className="pb-2">
							<CardDescription>Current Plan</CardDescription>
							<CardTitle className="text-xl uppercase">
								{isHydrated ? planType : 'FREE'}
							</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center justify-between text-xs text-muted-foreground">
							<span>Pass status: {isHydrated ? passStatus : 'inactive'}</span>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardDescription>Monthly Tokens Remaining</CardDescription>
							<CardTitle className="text-xl">
								{isHydrated ? formatTokens(remainingTokens) : '1,000'}
							</CardTitle>
						</CardHeader>
						<CardContent className="text-xs text-muted-foreground">
							{isHydrated
								? `${formatTokens(tokensUsedThisMonth)} / ${formatTokens(displayedAllowance)} used`
								: '0 / 1,000 used'}
						</CardContent>
					</Card>
				</div>
			</div>
		</DashboardShell>
	);
}
