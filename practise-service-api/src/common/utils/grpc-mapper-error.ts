import { status as grpcStatus } from '@grpc/grpc-js';
import { ApiError } from './api-error';

interface GrpcLikeError {
  code: grpcStatus;
  message: string;
}


export function toGrpcError(err: GrpcLikeError, context: string): ApiError {
  switch (err.code) {
    case grpcStatus.NOT_FOUND:
      return ApiError.notFound(err.message);
    case grpcStatus.INVALID_ARGUMENT:
      return ApiError.badRequest(err.message);
    case grpcStatus.UNAVAILABLE:
      return ApiError.serviceUnavailable(
        `${context} sedang tidak tersedia (gRPC UNAVAILABLE) — coba lagi beberapa saat`,
      );
    case grpcStatus.DEADLINE_EXCEEDED:
      return ApiError.serviceUnavailable(`${context} tidak merespons tepat waktu (gRPC DEADLINE_EXCEEDED)`);
    default:
      return ApiError.internal(`Gagal menghubungi ${context}: ${err.message}`);
  }
}