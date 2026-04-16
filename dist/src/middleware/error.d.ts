import { FastifyReply, FastifyRequest } from "fastify";
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly codeName: string;
    readonly details?: unknown;
    constructor(statusCode: number, codeName: string, message: string, details?: unknown);
}
export declare const globalErrorHandler: (error: unknown, request: FastifyRequest, reply: FastifyReply) => void;
