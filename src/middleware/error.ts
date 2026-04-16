import { FastifyReply, FastifyRequest } from "fastify";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly codeName: string;
  public readonly details?: unknown;

  constructor(statusCode: number, codeName: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.codeName = codeName;
    this.details = details;
  }
}

export const globalErrorHandler = (error: unknown, request: FastifyRequest, reply: FastifyReply): void => {
  if (error instanceof AppError) {
    request.log.warn({ err: error, codeName: error.codeName, details: error.details }, error.message);
    reply.code(error.statusCode).send({
      code: error.codeName,
      message: error.message,
      details: error.details
    });
    return;
  }

  request.log.error({ err: error }, "Unhandled error");
  reply.code(500).send({
    code: "INTERNAL_ERROR",
    message: "Internal server error"
  });
};
