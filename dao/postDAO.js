import { PostModel } from "../models/postModel";
import MongooseDAO from "./mongooseDAO";

class PostDAO extends MongooseDAO {}

export const postDAO = new PostDAO(PostModel);
export default postDAO;
