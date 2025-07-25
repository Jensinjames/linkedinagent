import { z } from "zod";

// Job validation schemas
export const createJobSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
  jobName: z
    .string()
    .min(1, "Job name is required")
    .max(100, "Job name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Job name contains invalid characters"),
});

export const manageJobSchema = z.object({
  jobId: z.string().uuid("Invalid job ID"),
  action: z.enum(["pause", "resume", "cancel", "retry"]),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: "Must be a valid file" }),
  size: z
    .number()
    .max(50 * 1024 * 1024, "File size must be less than 50MB"),
  type: z
    .string()
    .refine(
      (type) => 
        type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        type === "application/vnd.ms-excel",
      "Only Excel files (.xlsx, .xls) are allowed"
    ),
});

// Auth validation schemas
export const signInSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
});

export const signUpSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "First name can only contain letters and spaces"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces"),
  company: z
    .string()
    .max(100, "Company name must be less than 100 characters")
    .optional(),
});

// Rate limiting configuration
export const rateLimits = {
  fileUpload: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  jobManagement: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 actions per minute
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
} as const;

// Validation helpers
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((err) => err.message).join(", ");
      throw new Error(`Validation failed: ${messages}`);
    }
    throw error;
  }
};

export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/[^\w\s\-_.@]/g, ""); // Keep only safe characters
};