import { getRepository } from "typeorm";
import { Request, Response, NextFunction } from "express";
import { User } from "../models";
import { StatusCodes } from "http-status-codes";
import { responseFormat } from "../utils/responseFormat";
import { validationResult } from "express-validator";
import { RoleEnumType } from "../models/user";
import { RequestWithUser } from "../middleware/jwtServices";
import bcrypt from "bcryptjs";
import {
  CreateUserInput,
  LoginUserSchema,
  ChangePasswordUserSchema,
} from "../schemas/user";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../middleware/jwtServices";
class UserController {
  //[POST] /register
  static async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: "Validation error in request body",
            errors: errors.array(),
          })
        );
      }

      const payload: CreateUserInput = {
        ...req.body,
        role: RoleEnumType.USER,
      };

      const { email } = payload;

      const userRepository = getRepository(User);

      const isEmailExist = await userRepository.findOne({
        where: { email: email },
      });
      if (isEmailExist) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: `${email} already exists, Please enter another email!!!`,
          })
        );
      }

      const newUser = userRepository.create(payload);
      await userRepository.save(newUser);

      if (!newUser) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(
          responseFormat(false, {
            message: "User registration failed!!!",
          })
        );
      }

      return res.status(StatusCodes.OK).json(
        responseFormat(
          true,
          {
            message: "User registration successful!!!",
          },
          newUser
        )
      );
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
        responseFormat(false, {
          message: "Internal Server Error",
          error: error,
        })
      );
    }
  }

  //[POST] /login
  static async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: "Validation error in request body",
            errors: errors.array(),
          })
        );
      }

      const payload: LoginUserSchema = req.body;

      const { email, password } = payload;

      const userRepository = getRepository(User);

      const isEmailExist = await userRepository.findOne({
        where: { email: email },
      });
      if (!isEmailExist) {
        return res.status(StatusCodes.NOT_FOUND).json(
          responseFormat(false, {
            message: `This email: ${email} is not in use yet!!!`,
          })
        );
      }

      const isValid = await isEmailExist.comparePassword(password);

      if (!isValid) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: "Wrong password or email!!!",
          })
        );
      } else {
        const { id, password, role, ...userData } = isEmailExist;
        const accessToken = await signAccessToken(
          isEmailExist.id,
          isEmailExist.role
        );
        const refreshToken = await signRefreshToken(isEmailExist.id);

        isEmailExist.refreshToken = refreshToken;
        await userRepository.save(isEmailExist);

        res.cookie("refreshToken", refreshToken, {
          httpOnly: false,
          maxAge: 6 * 30 * 24 * 60 * 60 * 1000,
        });

        return res.status(StatusCodes.ACCEPTED).json(
          responseFormat(
            true,
            {
              message: "Logged in successfully!!!",
            },
            {
              accessToken,
              isEmailExist,
            }
          )
        );
      }
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
        responseFormat(false, {
          message: "Internal Server Error",
          error: error,
        })
      );
    }
  }

  //[get] /refreshToken
  static async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const cookie = req.cookies;
      if (!cookie || !cookie.refreshToken) {
        res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: "No refreshToken found in cookie !!!",
          })
        );
        return;
      }

      const isDataVerified: { id: string } = await verifyRefreshToken(
        cookie.refreshToken
      );

      const userRepository = getRepository(User);
      const user = await userRepository.findOne({
        where: {
          id: isDataVerified.id,
          refreshToken: cookie.refreshToken,
        },
      });

      if (!user) {
        res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: "No valid user found!!!",
          })
        );
        return;
      }

      const newAccessToken = await signAccessToken(user.id, user.role);
      const newRefreshToken = await signRefreshToken(user.id);

      const userToUpdate = await userRepository.findOne({
        where: {
          refreshToken: req.cookies.refreshToken,
        },
      });

      if (userToUpdate) {
        userToUpdate.refreshToken = newRefreshToken;
        await userRepository.save(userToUpdate);
      }

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: false,
        maxAge: 6 * 30 * 24 * 60 * 60 * 1000,
      });

      res.status(StatusCodes.OK).json(
        responseFormat(
          true,
          {
            message: "Update refreshToken successfully!!!",
          },
          newAccessToken
        )
      );
    } catch (error) {
      console.log(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
        responseFormat(false, {
          message: "Internal Server Error!!!",
          error: error,
        })
      );
    }
  }

  //[get] /logout
  static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userRepository = getRepository(User);
      const deletedUser = await userRepository.update(
        { refreshToken: req.cookies.refreshToken },
        { refreshToken: "" }
      );

      if (deletedUser) {
        await res.clearCookie("refreshToken", {
          httpOnly: false,
          secure: true,
        });

        res.status(StatusCodes.OK).json({
          success: true,
          message: "You have successfully logged out !!!",
        });
        return;
      } else {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "refreshToken not found !!!",
        });
        return;
      }
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
        error: error,
      });
      return;
    }
  }

  //[GET] /readProfile
  static async readProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: "Validation error in request body",
            errors: errors.array(),
          })
        );
      }

      const userRepository = getRepository(User);

      const userId: string = req.params.id;

      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json(
          responseFormat(false, {
            message: `No information found for ${req.params.id}`,
          })
        );
      }

      return res.status(StatusCodes.OK).json(
        responseFormat(
          true,
          {
            message: "Found information successfully !!!",
          },
          user
        )
      );
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
        responseFormat(false, {
          message: "Internal Server Error",
          error: error,
        })
      );
    }
  }

  //[PUT] /updateProfile
  static async updateProfile(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: "Validation error in request body",
            errors: errors.array(),
          })
        );
      }

      const userId: string | undefined = req.user?.id;
      const requestBody = req.body;

      const userRepository = getRepository(User);

      if (userId && requestBody) {
        const userDataToUpdate: Partial<User> = requestBody as Partial<User>;
        const isUserUpdated = await userRepository.update(
          userId,
          userDataToUpdate
        );
        if (!isUserUpdated) {
          return res.status(StatusCodes.NOT_FOUND).json(
            responseFormat(false, {
              message: `No information found for ${userId}`,
            })
          );
        }
      } else {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
          responseFormat(false, {
            message: "Internal Server Error",
          })
        );
      }

      const userApterUpdate = await userRepository.findOne({
        where: { id: userId },
      });

      return res.status(StatusCodes.OK).json(
        responseFormat(
          true,
          {
            message: "The data has been updated !!!",
          },
          userApterUpdate
        )
      );
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
        responseFormat(false, {
          message: "Internal Server Error",
          error: error,
        })
      );
    }
  }

  //[PUT] /changePassword
  static async changePassword(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: "Validation error in request body",
            errors: errors.array(),
          })
        );
      }

      const userId: string | undefined = req.user?.id;

      const payload: ChangePasswordUserSchema = req.body;

      const currentPassword: string = payload.currentPassword ?? "";
      const newPassword: string = payload.newPassword ?? "";

      const userRepository = getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json(
          responseFormat(false, {
            message: `${userId} not found !!!`,
          })
        );
      }

      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Current password is incorrect !!!",
        });
      }

      const isHashNewPassword = await bcrypt.hash(newPassword, 12);
      user.password = isHashNewPassword;
      const isPasswordChanged = await userRepository.save(user);

      if (!isPasswordChanged) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Password has not been changed !!!",
        });
      }

      return res.status(StatusCodes.OK).json(
        responseFormat(true, {
          message: "Changed password successfully!!!",
        })
      );
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
        responseFormat(false, {
          message: "Internal Server Error",
          error: error,
        })
      );
    }
  }
}

export default UserController;
