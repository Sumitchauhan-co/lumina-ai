'use server';

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { usersTable } from '@/db/schema';
import { verifyRefreshToken } from '@/utils/token';
import { getDb } from '@/db/index';

const updateProfileSchema = z.object({
	firstName: z.string().trim().min(1, 'First name is required').max(100),
	lastName: z.string().trim().max(100).nullable().optional(),
});

export interface ActionResult<T = unknown> {
	ok: boolean;
	data?: T;
	error?: string;
}

export interface UpdatedProfileUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	role: string;
}

const db = getDb();

async function getAuthenticatedUserId(): Promise<string | null> {
	const cookieStore = await cookies();
	const refreshToken =
		cookieStore.get('refreshToken')?.value ??
		cookieStore.get('refresh_token')?.value;

	if (!refreshToken) return null;

	const payload = await verifyRefreshToken(refreshToken);
	return payload?.id ?? null;
}

export async function updateUserProfileAction(input: {
	firstName: string;
	lastName?: string | null;
}): Promise<ActionResult<{ user: UpdatedProfileUser }>> {
	try {
		const userId = await getAuthenticatedUserId();
		if (!userId) {
			return { ok: false, error: 'Unauthorized. Please sign in again.' };
		}

		const parsed = updateProfileSchema.safeParse({
			firstName: input.firstName,
			lastName: input.lastName ? input.lastName.trim() : null,
		});

		if (!parsed.success) {
			return {
				ok: false,
				error: parsed.error.issues[0]?.message ?? 'Invalid profile data.',
			};
		}

		const [updated] = await db
			.update(usersTable)
			.set({
				firstName: parsed.data.firstName,
				lastName: parsed.data.lastName ?? null,
			})
			.where(eq(usersTable.id, userId))
			.returning({
				id: usersTable.id,
				email: usersTable.email,
				firstName: usersTable.firstName,
				lastName: usersTable.lastName,
				role: usersTable.role,
			});

		if (!updated) {
			return { ok: false, error: 'User account not found.' };
		}

		return {
			ok: true,
			data: { user: updated },
		};
	} catch {
		return {
			ok: false,
			error: 'Failed to update profile settings.',
		};
	}
}

export async function deleteUserAccountAction(): Promise<ActionResult<null>> {
	try {
		const userId = await getAuthenticatedUserId();
		if (!userId) {
			return { ok: false, error: 'Unauthorized. Please sign in again.' };
		}

		const [deleted] = await db
			.delete(usersTable)
			.where(eq(usersTable.id, userId))
			.returning({ id: usersTable.id });

		if (!deleted) {
			return { ok: false, error: 'User account not found.' };
		}

		const cookieStore = await cookies();
		cookieStore.delete('refreshToken');
		cookieStore.delete('refresh_token');

		return { ok: true, data: null };
	} catch {
		return {
			ok: false,
			error: 'Failed to delete account. Please try again.',
		};
	}
}
