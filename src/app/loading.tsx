import Lumina from '@/components/home/icon';

export default function Loading() {
	return (
		<div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#09090b] text-zinc-100 px-4 relative overflow-hidden select-none">
			{/* Background Ambient Glow */}
			<div className="absolute w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

			<div className="relative flex flex-col items-center max-w-xs w-full space-y-6">
				{/* Pulsing Brand Icon */}
				<div className="animate-bounce duration-1000">
					<Lumina size="lg" />
				</div>

				{/* Loading Text */}
				<div className="text-center space-y-1">
					<p className="text-xs font-medium tracking-wide text-zinc-300 animate-pulse">
						Loading Lumina AI workspace...
					</p>
				</div>

				{/* Custom Animated Progress Bar */}
				<div className="w-full bg-zinc-900 border border-zinc-800/80 rounded-full h-1.5 overflow-hidden p-0.5 shadow-inner">
					<div className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 rounded-full animate-[shimmer_2s_infinite_linear] bg-[length:200%_100%]" />
				</div>
			</div>
		</div>
	);
}
