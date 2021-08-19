import { NotificationModel } from "../models/notificationModel";
import MongooseDAO from "./mongooseDAO";

class NotificationDAO extends MongooseDAO {}

export const NotificationDAO = new NotificationDAO(NotificationModel);
export default NotificationDAO;
