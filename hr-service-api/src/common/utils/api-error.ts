
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details?: unknown) {
    return new ApiError(400, message, details);
  }

  static notFound(message = 'Resource not found', details?: unknown) {
    return new ApiError(404, message, details);
  }

  static conflict(message = 'Conflict', details?: unknown) {
    return new ApiError(409, message, details);
  }

  static internal(message = 'Internal Server Error', details?: unknown) {
    return new ApiError(500, message, details);
  }
}
