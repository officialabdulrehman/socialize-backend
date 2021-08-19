import { LikeModel } from "../models/likeModel";
import MongooseDAO from "./mongooseDAO";

class LikeDAO extends MongooseDAO {}

export const likeDAO = new LikeDAO(LikeModel);
export default likeDAO;
