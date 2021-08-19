import { validationResult } from "express-validator";

export const restApiValidation = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error(`Bad Request`);
    error.data = errors.array().map((err) => {
      return {
        message: err.msg || "",
        param: err.param || "",
        location: err.location || "",
        value: err.value || "",
      };
    });
    error.code = 400;
    return next(error);
  }
  return true;
};

export const graphqlApiValidation = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error(`Bad Request`);
    error.data = errors.array().map((err) => {
      return {
        message: err.msg || "",
        param: err.param || "",
        location: err.location || "",
        value: err.value || "",
      };
    });
    throw error;
  }
};
