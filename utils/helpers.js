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

const setPaginationURLs = (res, result) => {
  if (
    result.pagination &&
    (result.pagination.next === "" || result.pagination.next)
  ) {
    const { pagination } = result;
    const { page, perPage, hasNext, hasPrevious } = pagination;
    const baseURL =
      res.req?.protocol + "://" + res.req?.get("host") + res.req?.originalUrl;
    const nextpage = `${baseURL}?page=${page + 1}&perPage=${perPage}`;
    const prevpage = `${baseURL}?page=${page - 1}&perPage=${perPage}`;
    pagination.next = null;
    pagination.previous = null;
    if (hasNext) pagination.next = nextpage;
    if (hasPrevious) pagination.previous = prevpage;
  }
  return result;
};

export const response = async (res, result) => {
  result = setPaginationURLs(res, result);
  const response = {
    message: "Success",
    result: result,
    errors: [],
  };
  res.status(200).json(response);
};
