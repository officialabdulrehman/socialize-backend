import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import {graphqlHTTP} from 'express-graphql';
import {graphqlSchema} from './graphql/schema/schema';
import {graphqlResolver} from './graphql/resolvers/resolver';


// import postRoutes from './routes/postRoutes';
// import userRoutes from './routes/userRoutes';
import recievers from './recievers';
import {authMiddleware} from './middlewares/authMiddleware';

import { 
  MONGODB_URI,
  SERVER_URL,
  PORT
} from "./utils/secrets";

const app = express()

axios.defaults.baseURL = SERVER_URL;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if(req.method === 'OPTIONS')
    return res.sendStatus(200)
  next()
})
app.use(express.json())

app.use(authMiddleware)

app.use('/graphql', graphqlHTTP({
  schema: graphqlSchema,
  rootValue: graphqlResolver,
  graphiql: true,
  formatError(err) {
    if(!err.originalError){
      return err
    }
    const { message, originalError: {data, code} } = err
    return {
      message: message || 'Oops, something went wrong',
      status: code || 500,
      data
    }
  }
}))
// app.use(userRoutes)
// app.use(postRoutes)

app.use((err, req, res, next) => {
  const { statusCode, message, data } = err
  res.status(statusCode || 500).json({ message: message, data: data })
})

mongoose.connect(MONGODB_URI.toString())
  .then(result => {
    const PORT = PORT || 8080
    const server = app.listen(PORT)
    console.log(`Server running at PORT: ${PORT}`)
    const io = require('./socket').init(server)

    io.on('connection', socket => {
      console.log('CLIENT CONNECTED', socket.id)

      socket.emit("message", `Welcome ${socket.id}`)

      socket.broadcast.emit("message", `Fellas, say hi to our nakama ${socket.id}`)

      console.log("userId = " +  socket.handshake.query.userId);
      let notificationReciever = socket.handshake.query.userId
      if(notificationReciever !== 'undefined'){
        recievers.push(notificationReciever)
      }

      socket.on('disconnect', () => {
        if(notificationReciever !== undefined){
          let index = recievers.findIndex(
            (reciever) => reciever === notificationReciever
          )
          recievers.splice(index, 1)
        }
        console.log(`${socket.id} disconnected`)
        socket.broadcast.emit("message", `Fellas, we have lost our nakama ${socket.id}`)
      })
    })
  })
  .catch(err => {
    throw new Error("Database connection error")
  })