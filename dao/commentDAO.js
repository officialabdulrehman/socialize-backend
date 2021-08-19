import { CommentModel } from "../models/commentModel";
import MongooseDAO from "./mongooseDAO";

class CommentDAO extends MongooseDAO {}

export const commentDAO = new CommentDAO(CommentModel);
export default commentDAO;
