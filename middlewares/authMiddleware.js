import jwt from "jsonwebtoken";
import { AUTH_HEADER, SERVER_SECRET } from "../utils/secrets";

export const graphqlAuthMiddleware = (req, res, next) => {
  let decodedToken = null;
  const authHeader = req.get(AUTH_HEADER);
  if (!authHeader) {
    req.isAuth = false;
    return next();
  }
  try {
    const token = req.get(AUTH_HEADER).split(" ")[1];
    decodedToken = jwt.verify(token, SERVER_SECRET);
  } catch (err) {
    console.log(err);
    req.isAuth = false;
    return next();
  }
  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};

export default graphqlAuthMiddleware;
