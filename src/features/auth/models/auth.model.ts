import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { usersTable } from '@/db/auth.schema';

// ==================== USER ROLE TYPE ====================
export type UserRole = 'user' | 'admin' | 'guest';

// ==================== DRIZZLE-ZOD BASE SCHEMAS ====================
// Schema for selecting/reading a user from the database
export const selectUserSchema = createSelectSchema(usersTable, {
	email: z.string().email('Invalid email address format'),
});

// Schema for inserting a new user into the database
export const insertUserSchema = createInsertSchema(usersTable, {
	email: z.string().email('Invalid email address format'),
	firstName: z.string().min(1, 'First name is required'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters long')
		.optional(),
});

// ==================== API REQUEST VALIDATION SCHEMAS ====================

// 1. User Registration Payload
export const registerSchema = z.object({
	firstName: z.string().min(1, 'First name is required').max(255),
	lastName: z.string().max(255).optional(),
	email: z.string().email('Please provide a valid email address'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
		.regex(/[0-9]/, 'Password must contain at least one number'),
});

// 2. User Login Payload
export const loginSchema = z.object({
	email: z.string().email('Please provide a valid email address'),
	password: z.string().min(1, 'Password is required'),
});

// 3. Password Reset Request Payload
export const forgotPasswordSchema = z.object({
	email: z.string().email('Please provide a valid email address'),
});

// 4. Reset Password Confirmation Payload
export const resetPasswordSchema = z.object({
	token: z.string().min(1, 'Reset token is required'),
	newPassword: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
		.regex(/[0-9]/, 'Password must contain at least one number'),
});

// 5. User Profile Update Payload
export const updateProfileSchema = z.object({
	firstName: z.string().min(1).max(255).optional(),
	lastName: z.string().max(255).optional(),
});

// ==================== TYPE EXPORTS ====================
export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
