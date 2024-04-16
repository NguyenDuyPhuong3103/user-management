import jwt from "jsonwebtoken";
import { Response, Request, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { responseFormat } from "../utils/responseFormat";

const signAccessToken = async (
  userId: string,
  role: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const payload = {
      id: userId,
      role,
    };
    const secret = process.env.ACCESS_TOKEN_SECRET || "";
    const options = {
      expiresIn: "1h",
    };

    jwt.sign(payload, secret, options, (err, token) => {
      if (err) reject(err);
      resolve(token || "");
    });
  });
};

const signRefreshToken = async (userId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const payload = {
      id: userId,
    };
    const secret = process.env.REFRESH_TOKEN_SECRET || "";
    const options = {
      expiresIn: "6m",
    };

    jwt.sign(payload, secret, options, (err, token) => {
      if (err) reject(err);
      resolve(token || "");
    });
  });
};

interface UserPayload {
  id: string;
  role: string;
}

export interface RequestWithUser extends Request {
  user?: UserPayload;
}

const verifyAccessToken = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.header("authorization");
  if (!authHeader) {
    return res.status(StatusCodes.NOT_FOUND).json(
      responseFormat(false, {
        message: `There is no authorization for the header sent from the client !!!`,
      })
    );
  }
  const bearerToken = authHeader.split(" ");
  const token = bearerToken[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "", (err, decode) => {
    if (err) {
      return res.status(StatusCodes.UNAUTHORIZED).json(
        responseFormat(false, {
          message: `There is an error in the verifyAccessToken part, the token is invalid !!!`,
          err: err,
        })
      );
    }
    req.user = decode as UserPayload;
    next();
  });
};

const verifyRefreshToken = async (
  refreshToken: string
): Promise<{ id: string }> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET || "",
      (err, decode) => {
        if (err) reject(err);
        resolve(decode as { id: string });
      }
    );
  });
};

export {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};
