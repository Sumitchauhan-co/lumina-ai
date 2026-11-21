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
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/store';
import {
	type ActiveSubscription,
	type PaymentOrderItem,
	formatAmount,
	formatDate,
} from './types';

interface SubscriptionDetailsProps {
	subscription: ActiveSubscription | null;
	passExpiryDate: string | null;
	orders: PaymentOrderItem[];
	cancelAtCycleEnd: boolean;
	onCancelAtCycleEndChange: (checked: boolean) => void;
	isCancelling: boolean;
	onCancelSubscription: () => void;
}

export function SubscriptionDetails({
	subscription,
	passExpiryDate,
	orders,
	cancelAtCycleEnd,
	onCancelAtCycleEndChange,
	isCancelling,
	onCancelSubscription,
}: SubscriptionDetailsProps) {
	const passStatus = useAuthStore((s) => s.passStatus);

	const canCancel =
		subscription !== null &&
		(subscription.status === 'active' ||
			subscription.status === 'authenticated' ||
			subscription.status === 'pending');

	return (
		<>
			{subscription && (
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<CardTitle>Subscription Details</CardTitle>
								<CardDescription className="font-mono text-xs">
									{subscription.razorpaySubscriptionId ?? subscription.id}
								</CardDescription>
							</div>
							<span className="rounded-md border px-2.5 py-1 text-xs font-medium capitalize">
								{subscription.status} • Pass: {passStatus}
							</span>
						</div>
					</CardHeader>

					<CardContent className="grid gap-4 text-sm sm:grid-cols-3">
						<div className="rounded-lg border bg-muted/30 p-3">
							<p className="text-xs text-muted-foreground">Period Start</p>
							<p className="mt-1 font-medium">
								{formatDate(subscription.currentPeriodStart)}
							</p>
						</div>
						<div className="rounded-lg border bg-muted/30 p-3">
							<p className="text-xs text-muted-foreground">Period End</p>
							<p className="mt-1 font-medium">
								{formatDate(subscription.currentPeriodEnd)}
							</p>
						</div>
						<div className="rounded-lg border bg-muted/30 p-3">
							<p className="text-xs text-muted-foreground">Pass Expiry</p>
							<p className="mt-1 font-medium">{formatDate(passExpiryDate)}</p>
						</div>
					</CardContent>

					{canCancel && (
						<>
							<Separator />
							<CardFooter className="flex flex-wrap items-center justify-between gap-4 pt-4">
								<label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
									<input
										type="checkbox"
										checked={cancelAtCycleEnd}
										onChange={(e) => onCancelAtCycleEndChange(e.target.checked)}
										className="h-4 w-4 rounded border-input"
									/>
									<span>Cancel at end of current billing cycle</span>
								</label>

								<Button
									variant="destructive"
									size="sm"
									disabled={isCancelling}
									onClick={onCancelSubscription}
								>
									{isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
								</Button>
							</CardFooter>
						</>
					)}
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Payment History</CardTitle>
					<CardDescription>
						Recent Razorpay subscription charges and orders.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{orders.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No payment orders found yet.
						</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="border-b text-xs text-muted-foreground uppercase">
										<th className="py-2.5 pr-4">Order ID</th>
										<th className="py-2.5 pr-4">Date</th>
										<th className="py-2.5 pr-4">Amount</th>
										<th className="py-2.5">Status</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{orders.map((order) => (
										<tr key={order.id}>
											<td className="py-3 pr-4 font-mono text-xs">
												{order.razorpayOrderId}
											</td>
											<td className="py-3 pr-4 text-muted-foreground">
												{formatDate(order.createdAt)}
											</td>
											<td className="py-3 pr-4 font-medium">
												{formatAmount(order.amountPaise, order.currency)}
											</td>
											<td className="py-3">
												<span className="rounded-md border px-2 py-0.5 text-xs capitalize">
													{order.status}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</>
	);
}
