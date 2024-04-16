import { Request, Response, NextFunction } from "express";
import { responseFormat } from "../utils/responseFormat";
import { StatusCodes } from "http-status-codes";

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Route ${req.originalUrl} not found!`) as Error;
  res.status(StatusCodes.NOT_FOUND).json(
    responseFormat(false, {
      message: error?.message,
    })
  );
  next(error);
};
