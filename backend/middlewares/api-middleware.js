import ErrorHandler from "../utils/errorHandler.js";

export default function apiKeyMiddleware(req, res, next) {
  // ⚡ CRITICAL: Always bypass CORS preflight OPTIONS requests immediately 
  // before checking for any headers or api keys.
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  // Check headers (supporting both lowercase and custom casings)
  const apiKey = req.headers["api-key"] || req.headers["API-Key"] || req.query.apiKey;

  if (!apiKey) {
    return next(new ErrorHandler("Forbidden: Missing Api Key", 403));
  }

  if (apiKey !== process.env.API_KEY) {
    return next(new ErrorHandler("Forbidden: Invalid API key", 403));
  }

  next();
}