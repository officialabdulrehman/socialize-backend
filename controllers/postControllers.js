import { validationResult } from 'express-validator/check'

import io from '../socket'
import Post from '../models/postModel'
import User from '../models/userModel'
import Comment from '../models/commentModel'
import Like from '../models/likeModel'
import Notification from '../models/notificationModel'
import recievers from '../recievers'


export const getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 10;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .populate("likes")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Posts fetched!!",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (error) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

export const postPost = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const {body} = req.body
  let creator
  const post = new Post ({
    body: body,
    commentCount: 0,
    likeCount: 0,
    creator: req.userId
  })
  post.save()
    .then(res => {
      return User.findById(req.userId)
    })
    .then(user => {
      creator = user
      user.posts.push(post)
      return user.save()
    })
    .then(result => {
      io.getIO().emit("newPost", {
        action: "create",
        message: "Post created successfully!",
        post: post,
        creator: { _id: creator._id, name: creator.name, imageUrl: creator.imageUrl },
      });
      res.status(201).json({
        message: 'Post created successfully!',
        post: post,
        creator: { _id: creator._id, name: creator.name, imageUrl: creator.imageUrl }
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
}

export const getPost = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 10;
  let totalComments
  let gNotification

  const notificationId = req.query.notificationId

  Comment.find({
    post: req.params.postId
  }).countDocuments()
    .then(items => {
      totalComments = items
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
  if(notificationId != -1){
    Notification.findById(notificationId)
      .then(isNotfication => {
        if (!isNotfication) {
          const error = new Error('Notification not found');
          error.statusCode = 404;
          throw error;
        }
        gNotification = notificationId
        if(!isNotfication.read){
          isNotfication.read = true
          isNotfication.save()
        }
      })
  }

  Post.findById(req.params.postId)
  .populate('comments')
  .populate('creator')
  .populate({
    path: 'comments',
    options: {
      sort: {createdAt: -1},
      skip: (currentPage - 1) * perPage,
      limit: perPage
    },
    populate: {
      path: 'creator',
    }
  })
  .populate('likes')
    .then(post => {
      if (!post) {
        const error = new Error("Post you are trying to see has been removed by the author");
        error.statusCode = 404;
        throw error;
      }
      if(gNotification){
        res.status(200).json({post: post, totalComments: totalComments, notificationId: notificationId || null})
      } else {
        res.status(200).json({post: post, totalComments: totalComments})
      }
    })
    .catch(err => {
      if(!err.statusCode){
        err.statusCode = 500
      }
      next(err)
    })
}

export const updatePost = (req, res, next) => {
  Post.findById(req.params.postId)
    .then(post => {
      if (!post) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        throw error;
      }
      if(post.creator.toString() !== req.userId){
        const error = new Error('oops, you are not authorized to deleted this post')
        error.statusCode = 403
        throw error
      }
      post.body = req.body.body
      return post.save()
    })
    .then(result => {
      res.status(201).json({message: 'Post updated successfully!'});
    })
    .catch((err) => {
      res.status(500).json({ error: 'Something went wrong' });
    });
}

export const postComment = (req, res, next) => {
  let gComment = {}
  let gName
  let gRecipient
  let gNotification
  Post.findById(req.params.postId)
  .populate('comments')
  .sort({createdAt: -1})
    .then(post => {
      if (!post) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        throw error;
      }
      const { body } = req.body
      const comment = new Comment({
        body: body,
        creator: req.userId,
        post: req.params.postId,
      })
      return comment.save()
    })
    .then(savedComment => {
      gComment._id = savedComment._id
      return User.findById(req.userId)
    })
    .then(user => {
      gName = user.name
      user.comments.push(gComment)
      return user.save()
    })
    .then(res => {
      return Post.findById(req.params.postId)
    })
    .then(post => {
      post.comments.push(gComment)
      post.commentCount += 1
      return post.save()
    })
    .then(updatedPost => {
      if(updatedPost.creator.toString() === req.userId.toString()){
        return
      }
      gRecipient = updatedPost.creator
      const notification = new Notification({
        creator: req.userId,
        recipient: updatedPost.creator,
        post: req.params.postId,
        action: 'commented on',
        comment: gComment._id,
        read: false,
        name: gName
      })

      return notification.save()
    })
    .then(savedNotification => {
      if(savedNotification){
        gNotification = savedNotification
        return User.findById(gRecipient)
      }
      return
    })
    .then(user => {
      if(user){
        user.notifications.push(gNotification)
        return user.save()
      }
      return
    })
    .then(() => {
      return Comment.findById(gComment._id).populate('creator')
    })
    .then(thecomment => {
      let isRecipient 

      if(gNotification){
        isRecipient = recievers.findIndex(
          reciever => reciever == gNotification.recipient
        )
      }
      if(isRecipient || isRecipient === 0){
        io.getIO().emit(`${recievers[isRecipient]}`, {action: 'comment', notification: gNotification})
      }
      res.status(201).json(thecomment);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Something went wrong' });
    });
}

export const likePost = (req, res, next) => {
  let gLike
  let gName
  let gRecipient
  let gNotification
  Post.findById(req.params.postId)
  .populate('likes')
    .then(post => {
      if (!post) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        throw error;
      }

      let isLiked = post.likes.findIndex(
        theLike => theLike.creator.toString() === req.userId.toString()
      )
      if(isLiked >= 0){
        const error = new Error('Post already liked by you');
        error.statusCode = 403;
        throw error;
      }

      const like = new Like({
        creator: req.userId,
        post: req.params.postId,
      })
      return like.save()
    })
    .then(updatedLike => {
      gLike = updatedLike
      return User.findById(req.userId)
    })
    .then(user => {
      gName = user.name
      user.likes.push(gLike)
      return user.save()
    })
    .then(updatedUser => {
      return Post.findById(req.params.postId)
    })
    .then(post => {
      post.likes.push(gLike)
      post.likeCount += 1
      return post.save()
    })
    .then(updatedPost => {
      if(updatedPost.creator.toString() === req.userId.toString()){
        return
      }
      gRecipient = updatedPost.creator
      const notification = new Notification({
        creator: req.userId,
        recipient: updatedPost.creator,
        post: req.params.postId,
        action: 'liked',
        like: gLike._id,
        read: false,
        name: gName
      })
      
      return notification.save()
    })
    .then(savedNotification => {
      if(savedNotification){
        gNotification = savedNotification
        return User.findById(gRecipient)
      }
      return
    })
    .then(user => {
      if(user){
        user.notifications.push(gNotification)
        return user.save()
      }
      return
    })
    .then(result => {
      let isRecipient 

      if(gNotification){
        isRecipient = recievers.findIndex(
          reciever => reciever == gNotification.recipient
        )
      }
      if(isRecipient || isRecipient === 0){
        io.getIO().emit(`${recievers[isRecipient]}`, {action: 'like', notification: gNotification})
      }
      res.status(201).json(gLike);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Something went wrong' });
    });
}

export const unlikePost = (req, res, next) => {
  let gNotify
  let gNotification
  Like.findById(req.params.likeId)
  .then(like => {
    if (!like) {
      const error = new Error('like not found, refresh the page');
      error.statusCode = 404;
      throw error;
    }
    if(like.creator.toString() !== req.userId){
      const error = new Error('Unauthorized access')
      error.statusCode = 403
      throw error
    }
    return like.remove()
  })
  .then(() => {
    return Post.findOne({likes: req.params.likeId})
  })
  .then(post => {
    if (!post) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }
    post.likes.pull(req.params.likeId)
    post.likeCount -= 1
    return post.save()
  })
  .then(() => {
    return User.findById(req.userId)
  })
  .then(user => {
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    user.likes.pull(req.params.likeId)
    return user.save()
  })
  .then(updatedUser => {
    return Notification.findOne({like: req.params.likeId})
  })
  .then(notification => {
    if(!notification){
      return
    }
    gNotification = notification
    return notification.delete()
  })
  .then(oldNot => {
    if(oldNot){
      gNotify = oldNot
      return User.findById(oldNot.recipient)
    }
    return
  })
  .then(user => {
    if(user){
      user.notifications.pull(gNotify._id.toString())
      return user.save()
    }
    return
  })
  .then(result => {
    let isRecipient 

      if(gNotification){
        isRecipient = recievers.findIndex(
          reciever => reciever == gNotification.recipient
        )
      }

      if(isRecipient || isRecipient === 0){
        io.getIO().emit(`${recievers[isRecipient]}`, {action: 'unlike', notification: gNotification})
      }
    res.status(200).json({ message: 'Unliked'})
  })
}

export const deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then(post => {
      if(!post){
        const error = new Error('Post not found')
        error.statusCode = 422
        throw error
      }
      if(post.creator.toString() !== req.userId){
        const error = new Error('Post not found')
        error.statusCode = 403
        throw error
      }
      return Post.findById(postId).populate('comments')
    })
    .then(resPost => {
      gPost = resPost
      return Post.findByIdAndRemove(postId)
    })
    .then(result => {
      return User.findById(req.userId)
    })
    .then(user => {
      user.posts.pull(postId)
      return user.save()
    })
    .then(() => {
      return Comment.remove({ post: postId})
    })
    .then(() => {
      return Like.remove({ post: postId})
    })
    .then(() => {
      return Notification.remove({post: postId})
    })
    .then(deletedNotification => {
      res.status(200).json({message: 'Post Deleted'})
    })
    .catch(err => {
      if(!err.statusCode){
        err.statusCode = 500
      }
      next(err)
    })
}

export const deleteComment = (req, res, next) => {
  let gNotify
  let gNotification
  Comment.findById(req.params.commentId)
  .then(comment => {
    if (!comment) {
      const error = new Error('Comment not found, refresh the page');
      error.statusCode = 404;
      throw error;
    }
    if(comment.creator.toString() !== req.userId){
      const error = new Error('oops, you are not authorized to deleted this post')
      error.statusCode = 403
      throw error
    }
    return comment.remove()
  })
  .then(() => {
    return Post.findOne({comments: req.params.commentId})
  })
  .then(post => {
    if (!post) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }
    post.comments.pull(req.params.commentId)
    post.commentCount -= 1 
    return post.save()
  })
  .then(() => {
    return User.findById(req.userId)
  })
  .then(user => {
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    user.comments.pull(req.params.commentId)
    return user.save()
  })
  .then(updatedUser => {
    return Notification.findOne({comment: req.params.commentId})
  })
  .then(notification => {
    if(!notification){
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    gNotification = notification
    return notification.delete()
  })
  .then(oldNot => {
    gNotify = oldNot
    return User.findById(oldNot.recipient)
  })
  .then(user => {
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    user.notifications.pull(gNotify._id.toString())
    return user.save()
  })
  .then(result => {
    let isRecipient 

      if(gNotification){
        isRecipient = recievers.findIndex(
          reciever => reciever == gNotification.recipient
        )
      }

      if(isRecipient || isRecipient === 0){
        io.getIO().emit(`${recievers[isRecipient]}`, {action: 'deleteComment', notification: gNotification})
      }

    res.status(200).json({ message: 'Comment Deleted'})
  })
}

export const updateComment = (req, res, next) => {
  Comment.findById(req.params.commentId)
  .then(comment => {
    if (!comment) {
      const error = new Error('Comment not found, refresh the page');
      error.statusCode = 404;
      throw error;
    }
    if(comment.creator.toString() !== req.userId){
      const error = new Error('oops, you are not authorized to deleted this post')
      error.statusCode = 403
      throw error
    }
    comment.body = req.body.body
    return comment.save()
  })
  .then(result => {
    res.status(200).json(result)
  })
}