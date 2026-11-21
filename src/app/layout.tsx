import type { Metadata } from 'next';
import {
	Plus_Jakarta_Sans,
	Poppins,
	Geist,
	Geist_Mono,
} from 'next/font/google';
import QueryProvider from '@/components/providers/queryProvider';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const jakartaSans = Plus_Jakarta_Sans({
	variable: '--font-jakarta',
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
});

const poppins = Poppins({
	variable: '--font-poppins',
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
});

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Lumina AI - Workspace',
	description: 'Next-generation multi-model AI assistant workspace',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${jakartaSans.variable} ${poppins.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col font-sans bg-background text-foreground">
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					<QueryProvider>{children}</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
