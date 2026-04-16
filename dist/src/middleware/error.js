"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    codeName;
    details;
    constructor(statusCode, codeName, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.codeName = codeName;
        this.details = details;
    }
}
exports.AppError = AppError;
const globalErrorHandler = (error, request, reply) => {
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
exports.globalErrorHandler = globalErrorHandler;
