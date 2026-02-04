export function errorHandler(err: any, req: any, res: any, next: any) {
  // eslint-disable-next-line no-console
  console.error('Error:', {
    message: err?.message,
    stack: err?.stack,
    path: req?.path,
    method: req?.method,
  });

  let statusCode = err?.statusCode || 500;
  let errorMessage = err?.message || 'Internal Server Error';

  if (err?.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation failed';
  } else if (err?.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid ID format';
  } else if (err?.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorMessage = 'Invalid authentication token';
  } else if (err?.name === 'MongoError' && err?.code === 11000) {
    statusCode = 409;
    errorMessage = 'Duplicate field value';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: errorMessage,
      statusCode,
      timestamp: new Date().toISOString(),
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err?.stack }),
  });
}

export default errorHandler;
