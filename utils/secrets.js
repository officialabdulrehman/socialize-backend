import dotenv from "dotenv";
dotenv.config();

const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";
export const MONGODB_URI = prod ? process.env["MONGODB_URI"] : process.env["MONGODB_LOCAL_URI"];

export const PORT = process.env.PORT
export const AUTH_HEADER = process.env["AUTH_HEADER"];
export const SERVER_SECRET = process.env["SERVER_SECRET"];
export const ACCESS_TOKEN_EXPIRATION_TIME = process.env["ACCESS_TOKEN_EXPIRATION_TIME"];
export const LINK_EXPIRATION_TIME = process.env["LINK_EXPIRATION_TIME"];

export const CLIENT_URL = process.env["CLIENT_URL"];
export const SERVER_URL = process.env["SERVER_URL"];

export const NODEMAILER_SERVICE_NAME = process.env["NODEMAILER_SERVICE_NAME"];

export const GCP_TYPE = process.env.GCP_TYPE;
export const GCP_USER = process.env["GCP_USER"];
export const GCP_REDIRECT_URI = process.env["GCP_REDIRECT_URI"];
export const GCP_CLIENT_ID = process.env["GCP_CLIENT_ID"];
export const GCP_CLIENT_SECRET = process.env["GCP_CLIENT_SECRET"];
export const GCP_REFRESH_TOKEN = process.env["GCP_REFRESH_TOKEN"];


if (!MONGODB_URI) {
  if (prod) {
      throw new Error("No mongo connection string. Set MONGODB_URI environment variable.");
  } else {
      throw new Error("No mongo connection string. Set MONGODB_URI_LOCAL environment variable.");
  }
}

if (!ACCESS_TOKEN_EXPIRATION_TIME) {
  throw new Error("No ACCESS_TOKEN_EXPIRATION_TIME. Set ACCESS_TOKEN_EXPIRATION_TIME environment variable.");
}

if (!LINK_EXPIRATION_TIME) {
  throw new Error("No LINK_EXPIRATION_TIME. Set LINK_EXPIRATION_TIME environment variable.");
}

if (!AUTH_HEADER) {
  throw new Error("No AUTH_HEADER. Set AUTH_HEADER environment variable.");
}

if (!CLIENT_URL) {
  throw new Error("No CLIENT_URL. Set CLIENT_URL environment variable.");
}

if (!SERVER_URL) {
  throw new Error("No SERVER_URL. Set SERVER_URL environment variable.");
}

if (!NODEMAILER_SERVICE_NAME) {
  throw new Error("No NODEMAILER_SERVICE_NAME. Set NODEMAILER_SERVICE_NAME environment variable.");
}

if (!GCP_USER) {
  throw new Error("No GCP_USER. Set GCP_USER environment variable.");
}

if (!GCP_REDIRECT_URI) {
  throw new Error("No GCP_REDIRECT_URI. Set GCP_REDIRECT_URI environment variable.");
}

if (!GCP_CLIENT_ID) {
  throw new Error("No GCP_CLIENT_ID found. Set ROCKETCHAT_API_URL environment variable.");
}

if (!GCP_CLIENT_SECRET) {
  throw new Error("No GCP_CLIENT_SECRET found. Set GCP_CLIENT_SECRET environment variable.");
}

if (!GCP_REFRESH_TOKEN) {
  throw new Error("No GCP_REFRESH_TOKEN. Set GCP_REFRESH_TOKEN environment variable.");
}

if (!GCP_REDIRECT_URI) {
  throw new Error("No GCP_REDIRECT_URI. Set GCP_REDIRECT_URI environment variable.");
}