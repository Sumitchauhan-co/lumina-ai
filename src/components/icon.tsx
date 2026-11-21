import React, { useId } from 'react';

interface LuminaIconProps {
	size?: 'sm' | 'md' | 'lg' | 'xl';
	className?: string;
}

export default function Lumina({
	size = 'md',
	className = '',
}: LuminaIconProps) {
	const gradientId = `lumina-gradient-${useId().replace(/:/g, '')}`;

	const sizeMap = {
		sm: 'h-8 w-8',
		md: 'h-10 w-10',
		lg: 'h-12 w-12',
		xl: 'h-16 w-16',
	};

	return (
		<div
			className={`group relative flex shrink-0 items-center justify-center select-none ${className}`}
		>
			<svg
				viewBox="0 0 100 100"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				className={`${sizeMap[size]} transition-transform duration-300 group-hover:scale-105`}
			>
				<defs>
					<linearGradient
						id={gradientId}
						x1="20"
						y1="15"
						x2="85"
						y2="85"
						gradientUnits="userSpaceOnUse"
					>
						<stop
							offset="0%"
							stopColor="#60A5FA"
						/>
						<stop
							offset="55%"
							stopColor="#2563EB"
						/>
						<stop
							offset="100%"
							stopColor="#06B6D4"
						/>
					</linearGradient>
				</defs>

				{/* Background */}
				<rect
					x="5"
					y="5"
					width="90"
					height="90"
					rx="25"
					fill="#080F1E"
					stroke="#2563EB"
					strokeOpacity="0.25"
					strokeWidth="1.5"
					className="transition-all duration-300 group-hover:stroke-opacity-60"
				/>

				{/* L Monogram */}
				<path
					d="M35 25V69C35 72.3 37.7 75 41 75H55"
					stroke={`url(#${gradientId})`}
					strokeWidth="7"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>

				{/* Radiating light beams */}
				<g
					stroke={`url(#${gradientId})`}
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path
						d="M62 59C68 54 72 48 75 41"
						strokeWidth="5"
					/>

					<path
						d="M64 70C73 66 80 59 85 50"
						strokeWidth="4.5"
					/>

					<path
						d="M63 81C75 78 85 70 91 61"
						strokeWidth="4"
						opacity="0.7"
					/>
				</g>
			</svg>
		</div>
	);
}
