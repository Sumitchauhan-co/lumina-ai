import { getDb } from '@/db';
import { usersTable } from '@/db/auth.schema';
import { generateRefreshToken } from '@/utils/token';
import { and, eq, isNull, or, sql } from 'drizzle-orm';

interface SocialProfile {
	authId: string;
	email: string;
	firstName: string;
	lastName: string | null;
}

export const createSocialSession = async (profile: SocialProfile) => {
	const db = getDb();

	return db.transaction(async (tx) => {
		let [user] = await tx
			.select()
			.from(usersTable)
			.where(eq(usersTable.authId, profile.authId))
			.limit(1);

		if (!user) {
			[user] = await tx
				.select()
				.from(usersTable)
				.where(sql`LOWER(${usersTable.email}) = ${profile.email}`)
				.limit(1);
		}

		if (!user) {
			const [createdUser] = await tx
				.insert(usersTable)
				.values({
					authId: profile.authId,
					firstName: profile.firstName,
					lastName: profile.lastName,
					email: profile.email,
					emailVerified: true,
				})
				.onConflictDoNothing()
				.returning();

			user = createdUser;
		}

		if (!user) {
			[user] = await tx
				.select()
				.from(usersTable)
				.where(eq(usersTable.authId, profile.authId))
				.limit(1);

			if (!user) {
				[user] = await tx
					.select()
					.from(usersTable)
					.where(sql`LOWER(${usersTable.email}) = ${profile.email}`)
					.limit(1);
			}
		}

		if (!user) {
			throw new Error('Unable to create or locate the social account.');
		}

		if (!user.authId || user.authId === profile.authId) {
			if (!user.authId || !user.emailVerified) {
				const [linkedUser] = await tx
					.update(usersTable)
					.set({ authId: profile.authId, emailVerified: true })
					.where(
						and(
							eq(usersTable.id, user.id),
							or(
								isNull(usersTable.authId),
								eq(usersTable.authId, profile.authId),
							),
						),
					)
					.returning();

				if (!linkedUser) {
					throw new Error('Unable to link this social sign-in to the account.');
				}
				user = linkedUser;
			}
		} else if (!user.emailVerified) {
			// Preserve the existing provider ID; this column stores only one provider.
			const [verifiedUser] = await tx
				.update(usersTable)
				.set({ emailVerified: true })
				.where(
					and(
						eq(usersTable.id, user.id),
						eq(usersTable.authId, user.authId),
					),
				)
				.returning();

			if (!verifiedUser) {
				throw new Error('Unable to verify the social account email.');
			}
			user = verifiedUser;
		}

		const refreshToken = await generateRefreshToken({
			id: user.id,
			role: user.role,
		});

		const [sessionUser] = await tx
			.update(usersTable)
			.set({ refreshToken })
			.where(eq(usersTable.id, user.id))
			.returning({
				id: usersTable.id,
				firstName: usersTable.firstName,
				lastName: usersTable.lastName,
				email: usersTable.email,
				role: usersTable.role,
				emailVerified: usersTable.emailVerified,
				planType: usersTable.planType,
				passStatus: usersTable.passStatus,
				passExpiryDate: usersTable.passExpiryDate,
				monthlyTokenAllowance: usersTable.monthlyTokenAllowance,
				tokensUsedThisMonth: usersTable.tokensUsedThisMonth,
				tokensUsedToday: usersTable.tokensUsedToday,
				refreshToken: usersTable.refreshToken,
				createdAt: usersTable.createdAt,
			});

		const sessionRefreshToken = sessionUser?.refreshToken;
		if (!sessionUser || !sessionRefreshToken) {
			throw new Error('Unable to create the social sign-in session.');
		}

		return { ...sessionUser, refreshToken: sessionRefreshToken };
	});
};
