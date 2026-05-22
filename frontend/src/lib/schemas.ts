import { z } from 'zod';

/** FR-002：密碼 ≥ 8 字元、含字母與數字 */
export const passwordSchema = z
  .string()
  .min(8, '密碼長度至少 8 字元')
  .regex(/[A-Za-z]/, '密碼必須包含至少一個字母')
  .regex(/\d/, '密碼必須包含至少一個數字');

export const emailSchema = z
  .string()
  .min(1, '請輸入 Email')
  .email('Email 格式不正確')
  .max(254);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  display_name: z.string().max(64).optional().or(z.literal('')),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '請輸入密碼'),
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyTokenSchema = z.object({
  token: z.string().min(32, '驗證連結不完整'),
});

// US2 — Profile
export const profileSchema = z.object({
  display_name: z
    .string()
    .max(64, '顯示名稱不可超過 64 字元')
    .optional()
    .or(z.literal('')),
  contact_info: z
    .string()
    .max(255, '聯絡資訊不可超過 255 字元')
    .optional()
    .or(z.literal('')),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;  // 2 MB
export const AVATAR_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'] as const;
