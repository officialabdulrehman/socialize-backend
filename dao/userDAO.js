import UserModel from "../models/userModel";
import MongooseDAO from "./mongooseDAO";

class UserDAO extends MongooseDAO {
  async findByEmail(email) {
    const result = await UserModel.findOne({ email });
    if (!result) {
      const error = new Error(`Record with email ${email} not found.`);
      error.data = [{ param: "email" }];
      error.code = 404;
      throw error;
    }
  }
}
export const userDAO = new UserDAO(UserModel);
export default userDAO;
