export const errorHandler = (error, req, res, next) => {
  console.error("Error:", error);
  const isProd = process.env.NODE_ENV === "production";

  // Mongoose validation error
  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation error",
      errors: Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {}),
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      message: `${field} already exists`,
    });
  }

  // Custom errors with status
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  // Default error — never leak internal error details to clients in production
  const statusCode = error.statusCode || 500;
  const message =
    statusCode >= 500 && isProd ? "Internal server error" : error.message || "Internal server error";
  res.status(statusCode).json({ message });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
