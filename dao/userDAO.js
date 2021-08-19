import { UserModel } from "../models/userModel";
import MongooseDAO from "./mongooseDAO";

class UserDAO extends MongooseDAO {
  async findByEmail(email) {
    const { data } = await this.find({ email });
    return data;
  }
}
export const userDAO = new UserDAO(UserModel);
export default userDAO;
