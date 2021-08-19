import express from "express";
import mongoose from "mongoose";
import { graphqlHTTP } from "express-graphql";
import { graphqlSchema } from "./graphql/schema/schema";
import { graphqlResolver } from "./graphql/resolvers/resolver";
import { graphqlAuthMiddleware } from "./middlewares/authMiddleware";
import { recievers } from "./recievers";
import { MONGODB_URI, PORT } from "./utils/secrets";
import { io } from "./socket";
import { cors } from "./utils/cors";

// import postRoutes from './routes/postRoutes';
// import userRoutes from './routes/userRoutes';
import { testRouter } from "./routes/test";

const app = express();

app.use(cors);
app.use(express.json());
app.use(graphqlAuthMiddleware);

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const {
        message,
        originalError: { data, code },
      } = err;
      return {
        code,
        message,
        result: {},
        errors: data,
      };
    },
  })
);

// app.use(userRoutes)
// app.use(postRoutes)
app.use("/api/v1", testRouter);

app.use((err, req, res, next) => {
  const { code, message, data } = err;
  res.status(code || 500).json({
    message,
    result: {},
    errors: data,
  });
});
try {
  const db = await mongoose.connect(MONGODB_URI.toString());
  const server = app.listen(PORT || 8080);
  console.log(`Server running at PORT: ${PORT || 8080}`);
  const myio = io.init(server);
  myio.on("connection", (socket) => {
    console.log("CLIENT CONNECTED", socket.id);

    socket.emit("message", `Welcome ${socket.id}`);

    socket.broadcast.emit(
      "message",
      `Fellas, say hi to our nakama ${socket.id}`
    );

    console.log("userId = " + socket.handshake.query.userId);
    let notificationReciever = socket.handshake.query.userId;
    if (notificationReciever !== "undefined") {
      recievers.push(notificationReciever);
    }

    socket.on("disconnect", () => {
      if (notificationReciever !== undefined) {
        let index = recievers.findIndex(
          (reciever) => reciever === notificationReciever
        );
        recievers.splice(index, 1);
      }
      console.log(`${socket.id} disconnected`);
      socket.broadcast.emit(
        "message",
        `Fellas, we have lost our nakama ${socket.id}`
      );
    });
  });
} catch (err) {
  throw new Error("Database connection error");
}
