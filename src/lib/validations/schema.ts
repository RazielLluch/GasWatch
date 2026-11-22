import { z } from "zod";

export const signupSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirm_password: z.string(),
  options: z.object({
    data: z.object({
      first_name: z.string().trim().min(1, "First name is required"),
      last_name: z.string().trim().min(1, "Last name is required"),
    }),
  })
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});