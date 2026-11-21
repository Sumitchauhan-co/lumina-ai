'use client';

import {
	CreditCard,
	LayoutDashboard,
	MessageSquare,
	Settings,
	X,
} from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import Lumina from '../icon';
import { UserProfileDropdown } from './UserProfile';

export type DashboardTab = 'overview' | 'chat' | 'billing' | 'settings';

interface NavItem {
	id: DashboardTab;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	description: string;
}

const MAIN_NAV: NavItem[] = [
	{
		id: 'overview',
		label: 'Overview',
		icon: LayoutDashboard,
		description: 'Workspace & usage snapshot',
	},
	{
		id: 'chat',
		label: 'Chat',
		icon: MessageSquare,
		description: 'AI assistant workspace',
	},
];

const SETTINGS_NAV: NavItem[] = [
	{
		id: 'billing',
		label: 'Billing',
		icon: CreditCard,
		description: 'Plan, tokens & invoices',
	},
	{
		id: 'settings',
		label: 'Account Settings',
		icon: Settings,
		description: 'Profile & session security',
	},
];

interface DashboardSidebarProps {
	activeTab: DashboardTab;
	onSelectTab: (tab: DashboardTab) => void;
	mobileOpen?: boolean;
	onCloseMobile?: () => void;
}

export function DashboardSidebar({
	activeTab,
	onSelectTab,
	mobileOpen = false,
	onCloseMobile,
}: DashboardSidebarProps) {
	const handleTabClick = (tab: DashboardTab) => {
		onSelectTab(tab);
		onCloseMobile?.();
	};

	const renderNavButton = (item: NavItem) => {
		const Icon = item.icon;
		const isActive = activeTab === item.id;

		return (
			<button
				key={item.id}
				type="button"
				onClick={() => handleTabClick(item.id)}
				className={cn(
					'group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
					isActive
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground',
				)}
			>
				<Icon className="h-4 w-4 shrink-0" />
				<div className="min-w-0 flex-1">
					<div className="truncate">{item.label}</div>
				</div>
			</button>
		);
	};

	const sidebarBody = (
		<aside className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">
			{/* Brand Header */}
			<div className="flex h-14 items-center justify-between px-4">
				<button
					type="button"
					onClick={() => handleTabClick('overview')}
					className="flex cursor-pointer items-center gap-2 font-semibold tracking-tight"
				>
					<Lumina /> Dashboard
				</button>

				{onCloseMobile && (
					<Button
						variant="ghost"
						size="icon"
						className="lg:hidden"
						onClick={onCloseMobile}
						aria-label="Close sidebar"
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>

			<Separator />

			{/* Navigation Groups */}
			<div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
				<div className="space-y-1">
					<p className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						Workspace
					</p>
					<nav className="mt-2 space-y-1">{MAIN_NAV.map(renderNavButton)}</nav>
				</div>

				<div className="space-y-1">
					<p className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						Settings
					</p>
					<nav className="mt-2 space-y-1">
						{SETTINGS_NAV.map(renderNavButton)}
					</nav>
				</div>
			</div>

			{/* Footer User Dropdown */}
			<UserProfileDropdown onAfterNavigate={onCloseMobile} />
		</aside>
	);

	return (
		<>
			{/* Desktop Sidebar */}
			<div className="hidden lg:block lg:shrink-0">{sidebarBody}</div>

			{/* Mobile Drawer */}
			{mobileOpen && (
				<div className="fixed inset-0 z-50 flex lg:hidden">
					<div
						className="fixed inset-0 bg-background/80 backdrop-blur-xs"
						onClick={onCloseMobile}
					/>
					<div className="relative z-10 flex h-full">{sidebarBody}</div>
				</div>
			)}
		</>
	);
}
