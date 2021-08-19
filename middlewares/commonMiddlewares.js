import { check } from "express-validator";

export const checkParamId = [
  check("id", "Invalid id")
    .exists()
    .isLength({ min: 24, max: 24 })
    .isHexadecimal(),
];
