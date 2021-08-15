import express from 'express'
//import { body } from 'express-validator/check'

import {
  getPosts,
  postPost,
  getPost,
  postComment,
  likePost,
  unlikePost,
  deletePost,
  deleteComment,
  updateComment,
  updatePost
} from "../controllers/postControllers"

import {authMiddleware} from '../middlewares/authMiddleware'

export const postRouter = express.Router();
export default postRouter

postRouter.get('/posts', authMiddleware, getPosts)
postRouter.post('/post', authMiddleware, postPost)
postRouter.post('/post/:postId/update', authMiddleware, updatePost)
postRouter.get('/post/:postId', authMiddleware ,getPost)
postRouter.delete('/post/:postId', authMiddleware, deletePost);
postRouter.get('/post/:postId/like', authMiddleware, likePost);
postRouter.get('/post/:likeId/unlike', authMiddleware, unlikePost);
postRouter.post('/post/:postId/comment', authMiddleware, postComment)
postRouter.post('/post/:commentId/updateComment', authMiddleware, updateComment)
postRouter.delete('/post/:commentId/comment', authMiddleware, deleteComment)