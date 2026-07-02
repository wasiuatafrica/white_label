import { z } from 'zod';

const emailSchema = z.string().trim().email('A valid email is required').transform((v) => v.toLowerCase());

export const partnerAdminPinSchema = z
  .string()
  .regex(/^\d{6,12}$/, 'PIN must be 6 to 12 digits');

export const partnerAdminLoginSchema = z.object({
  email: emailSchema,
  pin: partnerAdminPinSchema,
});

export const partnerForgotPinSchema = z.object({
  email: emailSchema,
});

export const partnerResetPinSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  new_pin: partnerAdminPinSchema,
});

export const traderLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const traderRegisterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const traderSetPasswordSchema = z.object({
  email: emailSchema.optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  setup_token: z.string().min(1, 'setup_token is required'),
});

export const verifyPinSchema = partnerAdminLoginSchema;
