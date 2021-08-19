import { check } from "express-validator";

export const userSignupInputValidator = [
  check("email", "Please enter a valid email").isEmail().normalizeEmail(),
  check("password", "Password must contain at least 8 characters")
    .trim()
    .isLength({ min: 8 }),
  check("confirmPassword")
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.confirmPassword) {
        return Promise.reject("Passwords do not match");
      }
      return true;
    }),
  check("name", "Name must contain at least 3 - 100 characters")
    .trim()
    .isLength({ min: 3, max: 100 }),
];

export const emailValidator = [
  check("email", "Please enter a valid email")
    .trim()
    .isEmail()
    .normalizeEmail(),
];
