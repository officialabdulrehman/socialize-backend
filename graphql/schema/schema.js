import { buildSchema } from 'graphql'

export const graphqlSchema = buildSchema(`
  scalar Date

  type Post {
    _id: ID!
    comments: [Comment!]!
    likes: [Like!]!
    body: String!
    commentCount: Int!
    likeCount: Int!
    creator: User!
    createdAt: Date
    updatedAt: Date
  } 
  type Like {
    _id: ID!
    post: Post!
    creator: User!
    recipient: User
    createdAt: Date
    updatedAt: Date
    likeCount: Int
  }
  type Comment {
    _id: ID!
    body: String!
    post: Post!
    creator: User!
    createdAt: Date
    updatedAt: Date
  }
  type Notification {
    _id: ID!
    creator: User!
    recipient: User!
    post: String!
    action: String!
    name: String!
    like: Like
    comment: Comment
    read: Boolean!
    createdAt: Date
    updatedAt: Date
  } 

  type AuthData {
    token: String!
    userId: String!
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    bio: String
    website: String
    imageUrl: String
    location: String
    posts: [Post!]!
    likes: [Like!]!
    comments: [Comment!]!
    notifications: [Notification!]!
    createdAt: Date
  }

  input signupInputData {
    email: String!
    name: String!
    password: String!
    confirmPassword: String!
  }

  type signupReturnObject {
    message: String!
  }

  type postUserDetailsReturnObject {
    bio: String!
    website: String!
  }

  type otherUserDetails {
    userDoc: User!
    totalItems: Int!
  }

  type postData {
    posts: [Post!]!
    totalItems: Int!
  }

  type singlePost {
    post: Post!
    notification: Boolean
  }

  type comment {
    commentCount: Int
    comment: Comment
  }

  type RootQuery {
    login(email: String!, password: String!): AuthData!
    getAuthUser: User!
    getUserDetails(userId: ID!, page: Int): otherUserDetails!

    getPosts(page: Int!): postData!
    getPost(postId: String!, notificationId: ID, page: Int): singlePost!
  }

  type RootMutation {
    signup(signupInput: signupInputData): signupReturnObject!
    postUserDetails(bio: String!, website: String!): postUserDetailsReturnObject!
    saveImageUrl(imageUrl: String!): Boolean!
    searchEmail(email: String!): String!
    resetPassword(password: String!, confirmPassword: String!, token: String!): String!
    resendEmailVerification(email: String!): String!
    
    newPost(body: String!): Post!
    editPost(postId: ID!, body: String!): Boolean!
    deletePost(postId: ID!): Boolean!
    comment(postId: ID!, body: String!, detail: Boolean): comment
    like(postId: ID!): Like!
    unlike(likeId: ID!): Boolean
    editComment(commentId: ID!, body: String!): Boolean!
    deleteComment(commentId: ID!): Boolean!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`)

export default graphqlSchema