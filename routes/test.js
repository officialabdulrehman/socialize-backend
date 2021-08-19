import { Router } from "express";
import { check } from "express-validator";
import { userDAO } from "../dao/userDAO";
import { restApiValidation } from "../utils/helpers";
import { checkParamId } from "../middlewares/commonMiddlewares";
import { userSignupInputValidator } from "../middlewares/userInputMiddlewares";

export const testRouter = Router();
export default testRouter;

testRouter.get("/test", [], async (req, res, next) => {
  const result = await userDAO.find({});
  res.status(200).json(result);
});

testRouter.get("/test/:id", [...checkParamId], async (req, res, next) => {
  if (!restApiValidation(req, next)) return next();
  const id = String(req.params.id);
  const result = await userDAO.findById(id);
  res.status(200).json(result);
});

testRouter.post(
  "/test",
  [...userSignupInputValidator],
  async (req, res, next) => {
    if (!restApiValidation(req, next)) return next();
    const result = await userDAO.create({ ...req.body });
    res.status(200).json(result);
  }
);

testRouter.put("/test/:id", [...checkParamId], async (req, res, next) => {
  if (!restApiValidation(req, next)) return next();
  const id = String(req.params.id);
  const result = await userDAO.findByIdAndUpdate(id, { ...req.body });
  res.status(200).json(result);
});

testRouter.delete("/test/:id", [...checkParamId], async (req, res, next) => {
  if (!restApiValidation(req, next)) return next();
  const id = String(req.params.id);
  const result = await userDAO.delete(id);
  res.status(200).json(result);
});
