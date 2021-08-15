import express from 'express'
import { check } from 'express-validator/check'

const {
  postSignup,
  postLogin,
  postImage,
  postUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
  emailConfirmation,
  searchEmail,
  forgotPassword,
  resetPassword,
  saveImageURI
} = require("../controllers/userControllers");

import User from '../models/userModel'

import isAuth from  '../middlewares/isAuth'

export const userRouter = express.Router();
export default userRouter

userRouter.post('/signup', [
  check('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .custom((value, {req}) => {
      return User.findOne( { email: value })
        .then(userDoc => {
          if(userDoc) return Promise.reject('Email already exists')
        })
    })
    .normalizeEmail(),

  check('password')
    .trim()
    .isLength({ min: 8 })
    .withMessage('Password must contain at least 8 characters'),
  
  check('confirmPassword')
    .trim()
    .custom((value, {req}) => {
      if(req.body.password !== req.body.confirmPassword) {
        return Promise.reject('Passwords do not match')
      }
      return true
    }),

  check('name')
    .trim()
    .isLength({ min: 3, max: 100})
    .withMessage('Name must contain at least 3 - 100 characters')

], postSignup)

userRouter.post('/login', [
  check('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email')
    .custom((value, {req}) => {
      return User.findOne( { email: value })
        .then(userDoc => {
          if(!userDoc) return Promise.reject("Email doesn't exist")
          return true
        })
    })
    .normalizeEmail(),

  check('password')
    .trim()
    .isLength({ min: 8 })
    .withMessage('Password must contain at least 8 characters')
], postLogin)

userRouter.post('/user/image', isAuth, postImage)
userRouter.post('/user/firebaseimage', isAuth, saveImageURI)
userRouter.post('/user', isAuth, postUserDetails)
userRouter.get('/user',isAuth, getAuthenticatedUser)

userRouter.get('/users/:userId', isAuth, getUserDetails);
userRouter.post('/notifications', isAuth, markNotificationsRead);
userRouter.get('/user/confirmation/:token', emailConfirmation)
userRouter.post('/user/searchemail', [
  check('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email')
    .custom((value, {req}) => {
      return User.findOne( { email: value })
        .then(userDoc => {
          if(!userDoc) return Promise.reject("Email doesn't exist")
          return true
        })
    })
    .normalizeEmail(),
], searchEmail)
userRouter.get('/user/forgotpassword/:token', forgotPassword)
userRouter.post('/user/resetpassword/:token', [
  check('password')
    .trim()
    .isLength({ min: 8 })
    .withMessage('Password must contain at least 8 characters'),
  
  check('confirmPassword')
    .trim()
    .custom((value, {req}) => {
      if(req.body.password !== req.body.confirmPassword) {
        return Promise.reject('Passwords do not match')
      }
      return true
    }),
], resetPassword)