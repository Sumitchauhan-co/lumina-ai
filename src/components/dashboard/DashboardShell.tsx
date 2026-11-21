'use client';

import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/store';
import { AccountSettingsPanel } from './AccountSettingsPanel';
import { BillingPage } from './BillingPage';
import { type DashboardTab, DashboardSidebar } from './DashboardSidebar';
import { ModeToggle } from '../mode-toggle';

const TAB_TITLES: Record<DashboardTab, string> = {
	overview: 'Dashboard Overview',
	chat: 'AI Chat',
	billing: 'Billing',
	settings: 'Account Settings',
};

interface DashboardShellProps {
	title?: string;
	initialTab?: DashboardTab;
	chatComponent?: React.ReactNode;
	children?: React.ReactNode;
}

export function DashboardShell({
	title,
	initialTab = 'overview',
	chatComponent,
	children,
}: DashboardShellProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
	const [mobileOpen, setMobileOpen] = useState(false);

	const user = useAuthStore((s) => s.user);
	const isHydrated = useAuthStore((s) => s.isHydrated);
	const fetchUser = useAuthStore((s) => s.fetchUser);

	useEffect(() => {
		if (isHydrated && !user) {
			void fetchUser();
		}
	}, [isHydrated, user, fetchUser]);

	const handleSelectTab = (tab: DashboardTab) => {
		if (tab === 'chat' && !chatComponent) {
			router.push('/');
			return;
		}
		setActiveTab(tab);
	};

	const renderRightPanel = () => {
		switch (activeTab) {
			case 'billing':
				return <BillingPage />;
			case 'settings':
				return <AccountSettingsPanel />;
			case 'chat':
				return chatComponent ?? children;
			case 'overview':
			default:
				return children;
		}
	};

	return (
		<div className="flex min-h-screen bg-background text-foreground">
			<DashboardSidebar
				activeTab={activeTab}
				onSelectTab={handleSelectTab}
				mobileOpen={mobileOpen}
				onCloseMobile={() => setMobileOpen(false)}
			/>

			<div className="flex min-w-0 flex-1 flex-col">
				{/* Top Bar */}
				<header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-xs lg:px-6">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="icon"
							className="lg:hidden"
							onClick={() => setMobileOpen(true)}
							aria-label="Open sidebar"
						>
							<Menu className="h-5 w-5" />
						</Button>
						<h1 className="text-base font-semibold tracking-tight sm:text-lg">
							{activeTab === 'overview' && title
								? title
								: TAB_TITLES[activeTab]}
						</h1>
					</div>

					<div className="flex items-center gap-2">
						<ModeToggle />
					</div>
				</header>

				{/* Right Side Content Area */}
				<main className="flex-1 px-4 py-6 lg:px-8">{renderRightPanel()}</main>
			</div>
		</div>
	);
}
