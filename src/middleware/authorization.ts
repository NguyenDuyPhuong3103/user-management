import { Response, Request, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { responseFormat } from "../utils/responseFormat";
import { RequestWithUser } from "./jwtServices";

export const isAdmin = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const role: string | undefined = req.user?.role;

  if (role !== "admin") {
    return next(
      res.status(StatusCodes.NOT_FOUND).json(
        responseFormat(false, {
          message: `Must be Admin required !!!`,
        })
      )
    );
  }
  next();
};
