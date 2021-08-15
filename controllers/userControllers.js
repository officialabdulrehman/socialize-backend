import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { google } from 'googleapis'

import { validationResult } from 'express-validator/check'

import User from '../models/userModel'
import Post from '../models/postModel'

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
} from "../utils/secrets"

const oAuth2Client = new google.auth.OAuth2(GCP_CLIENT_ID, GCP_CLIENT_SECRET, GCP_REDIRECT_URI)
oAuth2Client.setCredentials({ refresh_token: GCP_REFRESH_TOKEN })

export const postSignup = (req, res, next) => {
  const errors = validationResult(req)
  if(!errors.isEmpty()){
    const error = new Error(errors.array()[0].msg)
    error.statusCode = 422
    error.data = errors.array()
    throw error
  }

  const { email, password, name} = req.body
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        name: name,
      });
      return user.save();
    })
    .then((result) => {
      nodemailer.createTestAccount((err, account) => {
        oAuth2Client.getAccessToken().then((accessToken) => {
          let transporter = nodemailer.createTransport({
            service: NODEMAILER_SERVICE_NAME,
            auth: {
              type: GCP_TYPE,
              user: GCP_USER,
              privateKey: GCP_CLIENT_SECRET,
              clientId: GCP_CLIENT_ID,
              clientSecret: GCP_CLIENT_SECRET,
              refresh_token: GCP_REFRESH_TOKEN,
              accessToken: accessToken.token
            },
          });

          jwt.sign(
            {
              userId: result._id.toString(),
            },
            SERVER_SECRET,
            { expiresIn: LINK_EXPIRATION_TIME },
            (err, emailToken) => {
              const url = `${SERVER_URL}/user/confirmation/${emailToken}`;

              transporter.sendMail(
                {
                  from: `NizTheDev <${GCP_USER}>`,
                  to: result.email,
                  subject: "Confirm your email",
                  html: `Please click this link to confirm your email: <a href="${url}">${url}</a>`,
                },
                (err, info) => {
                  next(err)
                }
              );
            }
          )
          .catch(err => {
            if(!err.statusCode){
              err.statusCode = 500
            }
            next(err)
          });
          res.status(201).json({
            message: "Confirm your email",
            userId: result._id,
          });
        });
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });

}

export const postLogin = (req, res, next) => {

  const errors = validationResult(req)
  if(!errors.isEmpty()){
    const error = new Error(errors.array()[0].msg)
    error.statusCode = 422
    error.data = errors.array()
    throw error
  }
  
  const  { email, password } = req.body
  let user
  User.findOne({ email: email })
    .then(userData => {
      if(!userData){
        const error = new Error('No user found with that email')
        error.statusCode = 401
        throw error
      }
      if(!userData.isVerified){
        const error = new Error('Please verify your email')
        error.statusCode = 401
        throw error
      }
      user = userData
      return bcrypt.compare(password, user.password)
    })
    .then(match => {
      if(!match){
        const error = new Error('Wrong password')
        error.statusCode = 401
        error.data = [{param: 'password'}]
        throw error
      }
      const token = jwt.sign({
        email: user.email,
        userId: user._id.toString()
      }, SERVER_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION_TIME })
      res.status(200).json({token: token, userId: user._id.toString()})
    })
    .catch(err => {
      if(!err.statusCode){
        err.statusCode = 500
      }
      next(err)
    })

}

export const postImage = (req, res, next) => {
  User.findById(req.userId)
    .then(result => {
      res.status(200).json({ message: 'Success'})
    })
    .catch(err => {
      if(!err.statusCode){
        err.statusCode = 500
      }
      next(err)
    })
}

export const postUserDetails = (req, res, next) => {
  const { bio, location, website } = req.body
  User.findById(req.userId)
    .then(userDoc => {
      if(!userDoc){
        const error = new Error('No user found with that email')
        error.statusCode = 401
        throw error
      }
      if(bio) userDoc.bio = bio
      if(website) userDoc.website = website
      if(location) userDoc.location = location
      return userDoc.save()
    })
    .then(result => {
      const { email, name, bio, website, location, _id, imageUrl } = result
      res.status(200).json({ _id ,email, name, bio, website, location, imageUrl })
    })
    .catch(err => {
      if(!err.statusCode){
        err.statusCode = 500
      }
      next(err)
    })

}

export const getAuthenticatedUser = (req, res, next) => {
  User.findById(req.userId)
    .populate({
      path: 'notifications',
      options: {
        sort: {createdAt: -1},
        populate: {
          path: 'creator'
        }
      }
    })
    .then(user => {
      res.status(200).json(user)
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
    
}

export const getUserDetails = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 10;
  let totalItems
  const otherUser = req.params.userId
  
  Post.find({
    creator: otherUser
  }).countDocuments()
    .then(items => {
      totalItems = items
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });

  User.findById(otherUser)
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
    .then(userDoc => {
      res.status(200).json({userDoc: userDoc, totalItems: totalItems})
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
  
}

export const markNotificationsRead = (req, res, next) => {
  res.status(200).json({ message: 'Success'})
}

export const emailConfirmation = (req, res, next) => {
  let {userId, iat, exp} = jwt.verify(req.params.token, SERVER_SECRET)
  User.findById(userId)
  .then(user => {
    user.token = undefined
    user.isVerified = true
    return user.save()
  })
    .then(response => {
      res.redirect(`${CLIENT_URL}/login?&emailConfirmed=true`)
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
}

export const searchEmail = (req, res, next) => {
  
  const errors = validationResult(req)
  if(!errors.isEmpty()){
    const error = new Error(errors.array()[0].msg)
    error.statusCode = 422
    error.data = errors.array()
    throw error
  }
  
  const  { email } = req.body
  let user
  User.findOne({ email: email })
    .then(userData => {
      if(!userData){
        const error = new Error('No user found with that email')
        error.statusCode = 401
        throw error
      }
      nodemailer.createTestAccount((err, account) => {
        oAuth2Client.getAccessToken()
        .then((accessToken) => {

          let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: GCP_TYPE,
              user: GCP_USER,
              privateKey: GCP_CLIENT_SECRET,
              clientId: GCP_CLIENT_ID,
              clientSecret: GCP_CLIENT_SECRET,
              refresh_token: GCP_REFRESH_TOKEN,
              accessToken: authAccessToken.token
            },
          })
  
          jwt.sign(
            {
              userId: userData._id.toString()
            },
            SERVER_SECRET,
            { expiresIn: LINK_EXPIRATION_TIME },
            (err, emailToken) => {
              const url = `${SERVER_URL}/resetpassword/${emailToken}`
    
              transporter.sendMail({
                from: `NizTheDev <${GCP_USER}>`,
                to: email,
                subject: 'Confirm your email',
                html: `Please click this link to reset your password: <a href="${url}">${url}</a>`
              }, (err, info) => {
              if(err)
                next(err)
              })
            }
          )
        })
        .catch(err => {
          if(!err.statusCode){
            err.statusCode = 500
          }
          next(err)
        })
        res.status(201).json({
          message: "Check your email",
          userId: userData._id,
        });
        })
    })
    .catch(err => {
      if(!err.statusCode){
        err.statusCode = 500
      }
      next(err)
    })

}

export const forgotPassword = (req, res, next) => {
  res.redirect(`${CLIENT_URL}/resetpassword/${req.params.token}`)
}

export const resetPassword = (req, res, next) => {
  let {userId, iat, exp} = jwt.verify(req.params.token, SERVER_SECRET)
  
  const errors = validationResult(req)
  if(!errors.isEmpty()){
    const error = new Error(errors.array()[0].msg)
    error.statusCode = 422
    error.data = errors.array()
    throw error
  }

  const { password, confirmPassword } = req.body
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      return User.findByIdAndUpdate(userId, {password: hashedPassword})
    })
    .then((result) => {
      res.status(201).json({
        message: "Password updated",
        userId: result._id,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
}

export const saveImageURI = (req, res, next) => {
  const errors = validationResult(req)
  if(!errors.isEmpty()){
    const error = new Error(errors.array()[0].msg)
    error.statusCode = 422
    error.data = errors.array()
    throw error
  }
  
  const  { imageUrl, response } = req.body

  User.findByIdAndUpdate(req.userId, {imageUrl: imageUrl})
    .then(response => {
      res.status(201).json({message: 'Success'})
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
  res.status(201).json({message: 'Success'})
}