import ErrorHandler from "../utils/errorHandler.js";

export default function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers["api-key"]; // Expect API key in headers

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return next(new ErrorHandler("Forbidden: Invalid API key", 403));
  }

  next();
}