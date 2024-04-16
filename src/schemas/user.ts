import { object, string, TypeOf, z } from "zod";
import { RoleEnumType } from "../models/user";

export const createUserSchema = object({
  body: object({
    firstName: string({
      required_error: "firstName is required",
    }),
    lastName: string({
      required_error: "lastName is required",
    }),
    email: string({
      required_error: "Email address is required",
    }).email("Invalid email address"),
    password: string({
      required_error: "Password is required",
    })
      .min(6, "Password must be more than 6 characters")
      .max(32, "Password must be less than 32 characters"),
    passwordConfirm: string({
      required_error: "Please confirm your password",
    }),
    role: z.optional(z.nativeEnum(RoleEnumType)),
  }).refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Passwords do not match",
  }),
});

export const changePasswordUserSchema = object({
  body: object({
    currentPassword: string({
      required_error: "current password is required",
    }),
    newPassword: string({
      required_error: "new password is required",
    }),
    newPasswordConfirm: string({
      required_error: "Please confirm your new password",
    }),
    role: z.optional(z.nativeEnum(RoleEnumType)),
  }).refine((data) => data.newPassword === data.newPasswordConfirm, {
    path: ["passwordConfirm"],
    message: "newPasswords do not match",
  }),
});

export const loginUserSchema = object({
  body: object({
    email: string({
      required_error: "Email address is required",
    }).email("Invalid email address"),
    password: string({
      required_error: "Password is required",
    }).min(6, "Invalid email or password"),
  }),
});

export type CreateUserInput = Partial<
  Omit<TypeOf<typeof createUserSchema>["body"], "passwordConfirm" | "role">
>;

export type LoginUserSchema = TypeOf<typeof loginUserSchema>["body"];

export type ChangePasswordUserSchema = Partial<
  Omit<TypeOf<typeof changePasswordUserSchema>["body"], "passwordConfirm">
>;
