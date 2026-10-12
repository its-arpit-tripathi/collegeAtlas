import { z } from 'zod';

export const signupSchema = z.object({
    email: z.email({ message: "Invalid email format" })
      .min(3, { message: "Email must be at least 3 characters" })
      .max(50, { message: "Email must be less than 50 characters" }),

    password: z.string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .refine((val) => /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
      .refine((val) => /[a-z]/.test(val), { message: "Password must contain at least one lowercase letter" })
      .refine((val) => /[0-9]/.test(val), { message: "Password must contain at least one number" })
      .refine((val) => /[!@#$%^&*]/.test(val), { message: "Password must contain at least one special character (!@#$%^&*)" }),
});

export const signinSchema = z.object({
    email: z.email({ message: "Invalid email format" }),
    password: z.string().min(1, { message: "Password is required" }),
});

export default signupSchema;