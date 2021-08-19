import { UserModel } from "../models/userModel";
import MongooseDAO from "./mongooseDAO";

class UserDAO extends MongooseDAO {
  async findByEmail(email) {
    const { data } = await this.find({ email });
    if (data.length <= 0) {
      const error = new Error(`Record with email ${email} not found.`);
      error.data = [{ param: "email" }];
      error.code = 404;
      throw error;
    }
    return data[0];
  }
}
export const userDAO = new UserDAO(UserModel);
export default userDAO;
