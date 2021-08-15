import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { google } from 'googleapis'
import validator from 'validator'

import {io} from '../../socket'

import User from '../../models/userModel'
import Post from '../../models/postModel'
import Comment from '../../models/commentModel'
import Like from '../../models/likeModel'
import Notification from '../../models/notificationModel'

import recievers from '../../recievers'

import { 
  SERVER_SECRET,
  ACCESS_TOKEN_EXPIRATION_TIME,
  LINK_EXPIRATION_TIME,
  SERVER_URL,
  NODEMAILER_SERVICE_NAME,
  GCP_TYPE,
  GCP_USER,
  GCP_REDIRECT_URI,
  GCP_CLIENT_ID,
  GCP_CLIENT_SECRET,
  GCP_REFRESH_TOKEN,
} from "../../utils/secrets"

const oAuth2Client = new google.auth.OAuth2(
  GCP_CLIENT_ID.toString(), 
  GCP_CLIENT_SECRET.toString(), 
  GCP_REDIRECT_URI.toString()
)
oAuth2Client.setCredentials({ refresh_token: GCP_REFRESH_TOKEN.toString() })

export const graphqlResolver = {
  login: async({ email, password }, req) => {
    const user = await User.findOne({email})
    if(!user){
      const error = new Error('User not found')
      error.data = [{param: 'email'}]
      error.code = 401
      throw error
    }
    if(!user.isVerified){
      const error = new Error('Please verify your email')
      error.data = [{param: 'email'}]
      error.code = 401
      throw error
    }
    const isEqual = await bcrypt.compare(password, user.password)
    if(!isEqual){
      const error = new Error('Incorrect password')
      error.code = 401
      error.data = [{param: 'password'}]
      throw error
    }
    const token = jwt.sign({
      email: user.email,
      userId: user._id.toString()
    }, SERVER_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION_TIME })

    return { token, userId: user._id.toString()}
  },
  signup: async({ signupInput: { email, password, confirmPassword, name } }, req) => {
    const errors = [];
    if(!validator.isEmail(email)){
      error.data = [{ message: 'Invalid email', param: 'email'}]
      throw error
    }
    const existingUser = await User.findOne({email})
    if(existingUser){
      const error = new Error('User already exists')
      error.data = [{ message: 'User already exists', param: 'email'}]
      throw error
    }
    if(validator.isEmpty(name) || !validator.isLength(name, { min: 3, max: 100 })){
      const error = new Error('Name should contain 3 - 100 characters')
      error.data = [{ message: 'Name should contain 3 - 100 characters', param: 'name'}]
      throw error
    }
    if(validator.isEmpty(password) || !validator.isLength(password, { min: 8 })){
      const error = new Error('Password should contain at least 8 characters')
      error.data = [{ message: 'Password should contain at least 8 characters', param: 'password'}]
      throw error
    }
    if(password !== confirmPassword){
      const error = new Error('Passwords do not match')
      error.data = [{ message: 'Password do not match', param: 'confirmPassword'}]
      error.code = 422
      throw error
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      email: email,
      password: hashedPassword,
      name: name,
    });
    const user = await newUser.save();
    if(!user){
      const error = new Error('something went wrong')
      throw error
    }
    const authAccessToken = await oAuth2Client.getAccessToken();
    const transporter = nodemailer.createTransport({
      service: NODEMAILER_SERVICE_NAME,
      auth: {
        type: GCP_TYPE,
        user: GCP_USER,
        privateKey: GCP_CLIENT_SECRET,
        clientId: GCP_CLIENT_ID,
        clientSecret: GCP_CLIENT_SECRET,
        refresh_token: GCP_REFRESH_TOKEN,
        accessToken: authAccessToken.token
      }
    })
    const emailToken = jwt.sign(
      {
        userId: user._id.toString()
      },
      SERVER_SECRET,
      { expiresIn: LINK_EXPIRATION_TIME },
    )
    const userWithToken = await User.findByIdAndUpdate(user._id, { token: emailToken })
    const url = `${SERVER_URL}/user/confirmation/${emailToken}`
    const sentMail = await transporter.sendMail(
      {
        from: `NizTheDev <${GCP_USER}`,
        to: email,
        subject: "Confirm your email",
        html: `
          Please click this link to confirm your email: <a href="${url}">${url}</a>
        `,
      },
    );
    
    return {  message: "Confirm your email" }
  },
  getAuthUser: async(input, req) => {
    if(!req.isAuth || !req.userId){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    console.log('HERE',req.userId)
    const user = await User.findById(req.userId).populate({
      path: 'notifications',
      options: {
        sort: {createdAt: -1},
        populate: {
          path: 'creator'
        }
      }
    })
    console.log(user)
    if(!user){
      const error = new Error('User not found')
      error.code = 401
      throw error
    }
    return {
      ...user._doc,
      _id: user._id.toString(),
    }
  },
  postUserDetails: async({bio, website}, req) => {
    if(!req.isAuth || !req.userId){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    const user = await User.findByIdAndUpdate(req.userId, {bio: bio, website: website})
    if(!user){
      const error = new Error('User not found')
      error.code = 401
      throw error
    }
    return {
      bio,
      website
    }
  },
  getUserDetails: async(input, req) => {
    const currentPage = input.page || 1;
    const perPage = 10;
    const otherUser = input.userId

    let totalItems = Post.find({creator: otherUser}).countDocuments()

    const user = await User.findById(otherUser)
      .populate({
        path: 'posts',
        options: {
          sort: {createdAt: -1},
          skip: (currentPage - 1) * perPage,
          limit: perPage,
          populate: {
            path: 'creator'
          }
        },
        populate: {
          path: 'likes',
          populate: {
            path: 'creator'
          }
        },
      })
    if(!user){
      const error = new Error('User not found')
      error.code = 401
      throw error
    }
    
    return {
      userDoc: {
        ...user._doc,
      },
      totalItems
    }
  },
  saveImageUrl: async({imageUrl}, req) => {
    if(!req.isAuth || !req.userId){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    const user = await User.findByIdAndUpdate(req.userId, {imageUrl: imageUrl})

    if(!user){
      const error = new Error('User not found')
      error.code = 401
      throw error
    }
    
    return true
  },
  searchEmail: async({email}, req) => {
    const user = await User.findOne({ email: email })

    if(!user){
      const error = new Error('User not found')
      error.code = 401
      throw error
    }
    const authAccessToken = await oAuth2Client.getAccessToken();
    const transporter = nodemailer.createTransport({
      service: NODEMAILER_SERVICE_NAME,
      auth: {
        type: GCP_TYPE,
        user: GCP_USER,
        privateKey: GCP_CLIENT_SECRET,
        clientId: GCP_CLIENT_ID,
        clientSecret: GCP_CLIENT_SECRET,
        refresh_token: GCP_REFRESH_TOKEN,
        accessToken: authAccessToken.token
      }
    })
    const emailToken = jwt.sign(
      {
        userId: user._id.toString()
      },
      SERVER_SECRET,
      { expiresIn: LINK_EXPIRATION_TIME },
    )
    const userWithToken = await User.findByIdAndUpdate(user._id, { token: emailToken })
    const url = `${CLIENT_URL}/resetpassword/${emailToken}`
    const sentMail = await transporter.sendMail(
      {
        from: `NizTheDev <${GCP_USER}>`,
        to: email,
        subject: "Confirm your email",
        html: `
          Please click this link to reset your password: <a href="${url}">${url}</a>
        `
      }
    );
    return "Check your email"
  },
  resetPassword: async({password, confirmPassword, token}, req) => {

    let {userId, iat, exp} = jwt.verify(token, SERVER_SECRET, function(err, decoded){
      User.findOneAndUpdate({token: token}, {token: undefined})
      const error = new Error('Link expired, reset again.')
      error.data = [{message: 'Link expired, reset again.'}]
      error.code = 401
      throw error
    })

    if(!userId){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }

    const user = await User.findById(userId)

    if(!user.token || user.token.toString() !== token.toString()){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    if(validator.isEmpty(password) || !validator.isLength(password, { min: 8 })){
      const error = new Error('Password should contain at least 8 characters')
      error.data = [{param: 'password'}]
      error.code = 401
      throw error
    }
    if(password !== confirmPassword){
      const error = new Error('Passwords do not match')
      error.data = [{param: 'confirmPassword'}]
      error.code = 401
      throw error
    }

    const isEqual = await bcrypt.compare(password, user.password)

    if(isEqual){
      const error = new Error('New password can not be old password')
      error.data = [{param: 'password'}]
      error.code = 401
      throw error
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    user.token = undefined
    user.password = hashedPassword
    user.save()
    return "Password updated"
  },
  resendEmailVerification: async({email}, req) => {
    const user = await User.findOne({email: email})
    if(!userId){
      const error = new Error('User not found')
      error.code = 401
      throw error
    }
    const authAccessToken = await oAuth2Client.getAccessToken();
    const transporter = nodemailer.createTransport({
      service: NODEMAILER_SERVICE_NAME,
      auth: {
        type: GCP_TYPE,
        user: GCP_USER,
        privateKey: GCP_CLIENT_SECRET,
        clientId: GCP_CLIENT_ID,
        clientSecret: GCP_CLIENT_SECRET,
        refresh_token: GCP_REFRESH_TOKEN,
        accessToken: authAccessToken.token
      }
    })
    const emailToken = jwt.sign(
      {
        userId: user._id.toString()
      },
      SERVER_SECRET,
      { expiresIn: LINK_EXPIRATION_TIME },
    )
    const url = `${SERVER_URL}/user/confirmation/${emailToken}`
    const userWithToken = await User.findByIdAndUpdate(user._id, { token: emailToken })
    const sentMail = await transporter.sendMail(
      {
        from: `NizTheDev <${GCP_USER}`,
        to: email,
        subject: "Confirm your email",
        html: `
          Please click this link to confirm your email: <a href="${url}">${url}</a>
        `,
      },
    );
    return "Confirm your email"
  },


  getPosts: async({page}, req) => {
    const perPage = 10;

    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .populate("likes")
      .populate("comments")
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    return { posts, totalItems }
  },
  newPost: async({body}, req) => {
    
    if(!req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'auth'}]
      error.code = 401
      throw error
    }
    if(body.trim().length < 1){
      const error = new Error('Invalid input')
      error.data = [{ message: 'Invalid input', param: 'postModal'}]
      error.code = 401
      throw error
    }
    const newPost = new Post({ body, creator: req.userId })
    const post = await newPost.save()
    const postWithCreator = await Post.findById(post._id).populate('creator')
    const user = await User.findById(req.userId)
    user.posts.push(post)
    await user.save()
    io.getIO().emit("newPost", {
      action: "create",
      message: "Post created successfully!",
      post: postWithCreator,
      creator: { _id: user._id, name: user.name, imageUrl: user.imageUrl },
    });
    return postWithCreator._doc
  },
  editPost: async({ postId, body }, req) => {
    if(!req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'auth'}]
      error.code = 401
      throw error
    }
    if(body.trim().length < 1){
      const error = new Error('Invalid input')
      error.data = [{ message: 'Invalid input', param: 'postModal'}]
      error.code = 401
      throw error
    }
    const post = await Post.findById(postId)
    if(!post) {
      const error = new Error('Post not found')
      error.data = [{ message: 'Post not found', param: 'postModal'}]
      error.code = 401
      throw error
    }
    if(post.creator.toString() !== req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'postModal'}]
      error.code = 401
      throw error
    }

    post.body = body
    await post.save()

    return true
  },
  deletePost: async({ postId }, req) => {
    if(!req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'auth'}]
      error.code = 401
      throw error
    }

    const post = await Post.findById(postId)
    if(!post) {
      const error = new Error('Post not found')
      error.data = [{ message: 'Post not found', param: 'deleteModal'}]
      error.code = 401
      throw error
    }
    if(post.creator.toString() !== req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'deleteModal'}]
      error.code = 401
      throw error
    }
    await post.remove()

    const user = await User.findById(req.userId)
    user.posts.pull(postId)
    await user.save()

    await Comment.remove({ post: postId})
    await Like.remove({ post: postId})
    await Notification.remove({post: postId})

    return true
  },
  comment: async({ postId, body, detail }, req) => {
    if(!req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'auth'}]
      error.code = 401
      throw error
    }
    if(validator.isEmpty(body.trim())){
      const error = new Error('Invalid input')
      error.data = [{ message: 'Invalid input', param: 'comment'}]
      throw error
    }

    const post = await Post.findById(postId)
    if(!post) {
      const error = new Error('Post not found')
      error.data = [{ message: 'Post not found', param: 'comment'}]
      error.code = 401
      throw error
    }
    const newComment = new Comment({
      body,
      creator: req.userId,
      post: postId,
    })
    const comment = await newComment.save()

    const user = await User.findById(req.userId)
    user.comments.push(comment)
    await user.save()

    post.comments.push(comment)
    post.commentCount += 1
    await post.save()

    if(post.creator.toString() === req.userId.toString()){
    } else {
      const newNotification = new Notification({
        creator: req.userId,
        recipient: post.creator,
        post: postId,
        action: 'commented on',
        comment: comment._id,
        read: false,
        name: user.name
      })
      const notification = await newNotification.save()
      const recipientUser = await User.findById(post.creator)
      recipientUser.notifications.push(notification)
      await recipientUser.save()
  
      let recipientIndex = recievers.findIndex(
        reciever => reciever == notification.recipient
      )
      if(recipientIndex >= 0){
        io.getIO().emit(`${recievers[recipientIndex]}`, {action: 'comment', notification: {
          _id: notification._id,
          action: notification.action,
          read: notification.read,
          post: notification. post,
          recipient: notification.recipient,
          creator: { 
            _id: user._id,
            name: user.name,
            imageUrl: user.imageUrl
          }
        }})
      }
    }
    if(detail){
      return {
        comment: {...comment._doc, creator: { 
          _id: user._id,
          name: user.name,
          imageUrl: user.imageUrl
        }},
        commentCount: post.commentCount
      }
    }
    return {
      commentCount: post.commentCount
    }
  },
  like: async({ postId }, req) => {
    if(!req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'auth'}]
      error.code = 401
      throw error
    }
    const post = await Post.findById(postId)
    if(!post) {
      const error = new Error('Post not found')
      error.data = [{ message: 'Post not found', param: 'like'}]
      error.code = 401
      throw error
    }
    let isLiked = post.likes.findIndex(
      theLike => theLike.creator == req.userId
    )
    if(isLiked > 0){
      const error = new Error('You have already liked this post');
      error.data = [{ message: 'You have already liked this post', param: 'like'}]
      error.statusCode = 403;
      throw error;
    }
    const newLike = new Like({
      creator: req.userId,
      post: postId,
    })
    const like = await newLike.save()

    const user = await User.findById(req.userId)
    user.likes.push(like)
    await user.save()

    post.likes.push(like)
    post.likeCount += 1
    await post.save()

    if(post.creator.toString() === req.userId.toString()){
    } else {
      const newNotification = new Notification({
        creator: req.userId,
        recipient: post.creator,
        post: postId,
        action: 'liked',
        like: like._id,
        read: false,
        name: user.name
      })
      const notification = await newNotification.save()
      const recipientUser = await User.findById(post.creator)
      recipientUser.notifications.push(notification)
      await recipientUser.save()
  
      let recipientIndex = recievers.findIndex(
        reciever => reciever == notification.recipient
      )
      if(recipientIndex >= 0){
        io.getIO().emit(`${recievers[recipientIndex]}`, {action: 'like', notification: {
          _id: notification._id,
          action: notification.action,
          read: notification.read,
          post: notification. post,
          recipient: notification.recipient,
          creator: { 
            _id: user._id,
            name: user.name,
            imageUrl: user.imageUrl
          }
        }})
      }
    }
    return {
      ...like._doc,
      likeCount: post.likeCount
    }
  },
  unlike: async({ likeId }, req) => {
    if(!req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'auth'}]
      error.code = 401
      throw error
    }
    const like = await Like.findById(likeId)
    if(!like) {
      const error = new Error('Post not liked by you')
      error.data = [{ message: 'Post not liked by you', param: 'like'}]
      error.code = 401
      throw error
    }
    if(like.creator.toString() !== req.userId){
      const error = new Error('Unauthorized access')
      err.data = [{ message: 'Unauthorized access', param: 'like'}]
      error.statusCode = 403
      throw error
    }
    
    await like.remove()

    const post = await Post.findOne({likes: likeId})
    if(!post) {
      const error = new Error('Post not found')
      error.data = [{ message: 'Post not found', param: 'like'}]
      error.code = 401
      throw error
    }
    post.likes.pull(likeId)
    post.likeCount -= 1
    await post.save()

    const user = await User.findById(req.userId)
    user.likes.pull(likeId)
    await user.save()

    if(post.creator.toString() === like.creator.toString()){
      return true
    }

    const notification = await Notification.findOneAndDelete({like: likeId})
    const recipientUser = await User.findById(notification.recipient)
    recipientUser.notifications.pull(notification._id)
    await recipientUser.save()
  
    let recipientIndex = recievers.findIndex(
      reciever => reciever == notification.recipient
    )
    if(recipientIndex >= 0){
      io.getIO().emit(`${recievers[recipientIndex]}`, {action: 'unlike', notification: {
        _id: notification._id,
        action: notification.action,
        read: notification.read,
        post: notification. post,
        recipient: notification.recipient,
        creator: { 
          _id: user._id,
          name: user.name,
          imageUrl: user.imageUrl
        }
      }})
    }

    return true
  },
  getPost: async({ postId, notificationId, page }, req) => {
    const currentPage = page || 1;
    const perPage = 10;
    let notification
    if(notificationId != -1){
      notification = await Notification.findById(notificationId)
      if (!notification) {
        const error = new Error('Notification not found');
        error.data = [{message: 'Notification not found', param: 'notification'}]
        error.statusCode = 404;
        throw error;
      }
      if(!notification.read){
        notification.read = true
        await notification.save()
      }
    }
    const post = await Post.findById(postId)
      .populate('creator')
      .populate('likes')
      .populate('comments')
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

    if (!post) {
      const error = new Error("Post you are trying to see has been removed by the author");
      error.statusCode = 404;
      error.data = ["Post you are trying to see has been removed by the author"]
      throw error;
    }

    if(notification) return{post: {...post._doc}, notification: true}
    else return{post: {...post._doc}, notification: false}
    
  },
  editComment: async({ commentId, body }, req) => {
    if(!req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'auth'}]
      error.code = 401
      throw error
    }
    if(body.trim().length < 1){
      const error = new Error('Invalid input')
      error.data = [{ message: 'Invalid input', param: 'commenModal'}]
      error.code = 401
      throw error
    }

    const comment = await Comment.findById(commentId)
    if(comment.creator.toString() !== req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'commenModal'}]
      error.code = 401
      throw error
    }
    comment.body = body
    await comment.save()

    return true
  },
  deleteComment: async({ commentId }, req) => {
    if(!req.userId){
      const error = new Error('Unauthorized access')
      error.data = [{ message: 'Unauthorized access', param: 'auth'}]
      error.code = 401
      throw error
    }
    const comment = await Comment.findById(commentId)
    if(!comment) {
      const error = new Error('Comment not found')
      error.data = [{ message: 'Comment not found', param: 'comment'}]
      error.code = 401
      throw error
    }
    if(comment.creator.toString() !== req.userId){
      const error = new Error('Unauthorized access')
      err.data = [{ message: 'Unauthorized access', param: 'comment'}]
      error.statusCode = 403
      throw error
    }
    
    await comment.remove()

    const post = await Post.findOne({comments: commentId})
    if(!post) {
      const error = new Error('Post not found')
      error.data = [{ message: 'Post not found', param: 'comment'}]
      error.code = 401
      throw error
    }
    post.comments.pull(commentId)
    post.commentCount -= 1
    await post.save()

    const user = await User.findById(req.userId)
    user.comments.pull(commentId)
    await user.save()

    if(post.creator.toString() === comment.creator.toString()){
      return true
    }
    const notification = await Notification.findOneAndDelete({comment: commentId})
    const recipientUser = await User.findById(notification.recipient)
    recipientUser.notifications.pull(notification._id)
    await recipientUser.save()
  
    let recipientIndex = recievers.findIndex(
      reciever => reciever == notification.recipient
    )
    if(recipientIndex >= 0){
      io.getIO().emit(`${recievers[recipientIndex]}`, {action: 'deleteComment', notification: {
        _id: notification._id,
        action: notification.action,
        read: notification.read,
        post: notification. post,
        recipient: notification.recipient,
        creator: { 
          _id: user._id,
          name: user.name,
          imageUrl: user.imageUrl
        }
      }})
    }

    return true
  },
}

export default graphqlResolver