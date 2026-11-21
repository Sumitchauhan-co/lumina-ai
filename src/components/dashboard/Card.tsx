'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useAuthStore } from '@/store/store';
import { formatAmount, formatNumber } from './types';

interface PlanComparisonCardsProps {
	proOffer: {
		monthlyPricePaise: number;
		proMonthlyTokenAllowance: number;
	};
	isStartingCheckout: boolean;
	isCheckoutBlocked: boolean;
	onUpgradePro: () => void;
}

export function PlanComparisonCards({
	proOffer,
	isStartingCheckout,
	isCheckoutBlocked,
	onUpgradePro,
}: PlanComparisonCardsProps) {
	const planType = useAuthStore((s) => s.planType);
	const passStatus = useAuthStore((s) => s.passStatus);
	const monthlyTokenAllowance = useAuthStore((s) => s.monthlyTokenAllowance);

	const isProActive = planType === 'pro' && passStatus === 'active';
	const proTokenCount = isProActive
		? monthlyTokenAllowance
		: proOffer.proMonthlyTokenAllowance;

	return (
		<div className="grid gap-6 md:grid-cols-2">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Free</CardTitle>
						{!isProActive && (
							<span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
								Current
							</span>
						)}
					</div>
					<CardDescription>
						Starter access with a 30-day rolling token allowance.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2 text-sm text-muted-foreground">
					<p className="text-base font-semibold text-foreground">
						1,000 tokens per month
					</p>
					<p>• Standard model access via OpenRouter</p>
					<p>• 30-day monthly token quota tracking</p>
					<p>• Persistent chat threads</p>
				</CardContent>
				<CardFooter>
					<Button
						variant="outline"
						disabled
						className="w-full"
					>
						{isProActive ? 'Included in Pro' : 'Active Free Tier'}
					</Button>
				</CardFooter>
			</Card>

			<Card className="border-primary/40">
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Pro</CardTitle>
						{isProActive && (
							<span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
								Active Pass
							</span>
						)}
					</div>
					<CardDescription>
						Expanded monthly token capacity and flagship models.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<p className="text-2xl font-bold text-foreground">
						{formatAmount(proOffer.monthlyPricePaise, 'INR')}{' '}
						<span className="text-sm font-normal text-muted-foreground">
							/ month
						</span>
					</p>
					<p className="font-medium text-foreground">
						{formatNumber(proTokenCount)} tokens every 30 days
					</p>
					<p>• {formatNumber(proTokenCount)} monthly tokens (30-day cycle)</p>
					<p>• Flagship models via OpenRouter</p>
					<p>• Automated monthly quota reset</p>
				</CardContent>
				<CardFooter>
					<Button
						disabled={isCheckoutBlocked || isStartingCheckout}
						onClick={onUpgradePro}
						className="w-full cursor-pointer"
					>
						{isProActive
							? 'Pro Pass Active'
							: isCheckoutBlocked
								? 'Subscription Processing'
							: isStartingCheckout
								? 'Opening Checkout...'
								: 'Upgrade to Pro'}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
