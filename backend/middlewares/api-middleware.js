import ErrorHandler from "../utils/errorHandler.js";

export default function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers["api-key"]; // Expect API key in headers

  console.log(apiKey);
  
  console.log(process.env.API_KEY);
  

  if (!apiKey) {
    return next(new ErrorHandler("Forbidden: Missing Api Key", 403));
  }
  

  if (apiKey !== process.env.API_KEY) {
    return next(new ErrorHandler("Forbidden: Invalid API key", 403));
  }

  next();
}