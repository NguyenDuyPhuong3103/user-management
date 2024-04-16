import { isAdmin } from "./../middleware/authorization";
import { getRepository, DeepPartial } from "typeorm";
import { Request, Response, NextFunction } from "express";
import { User } from "../models";
import { CreateUserInput, LoginUserSchema } from "../schemas/user";
import { StatusCodes } from "http-status-codes";
import { RoleEnumType } from "../models/user";
import { responseFormat } from "../utils/responseFormat";
import { validationResult } from "express-validator";

class AuthController {
  static async readUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page: number = Number(req.query.page) || 1;
      const limit: number = Number(req.query.limit) || 7;
      const { searchText } = req.query;

      const offset: number = (page - 1) * limit;

      const userRepository = getRepository(User);

      let query = userRepository
        .createQueryBuilder("user")
        .select([
          "user.id",
          "user.firstName",
          "user.lastName",
          "user.email",
          "user.phone",
          "user.dob",
        ])
        .offset(offset)
        .limit(limit);

      if (searchText) {
        query = query
          .where("user.email LIKE :searchText", {
            searchText: `%${searchText}%`,
          })
          .orWhere("user.firstName LIKE :searchText", {
            searchText: `%${searchText}%`,
          })
          .orWhere("user.lastName LIKE :searchText", {
            searchText: `%${searchText}%`,
          });
      }

      const users: User[] = await query.getMany();

      return res.status(StatusCodes.OK).json(
        responseFormat(
          true,
          {
            message: "Get data successfully !!!",
          },
          users
        )
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Internal Server Error",
      });
    }
  }

  //[POST] /
  static async createUser(req: Request, res: Response) {
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
            message: "User creation failed!!!",
          })
        );
      }

      return res.status(StatusCodes.OK).json(
        responseFormat(
          true,
          {
            message: "user created successfully!!!",
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

  //[DELETE] /:id
  static async deleteUser(req: Request, res: Response) {
    try {
      const userRepository = getRepository(User);

      const userId: string = req.params?.id;

      const user: User | null = await userRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        return res.status(StatusCodes.BAD_REQUEST).json(
          responseFormat(false, {
            message: `Invalid ${user} !!!`,
          })
        );
      }

      const isUserDeleted = await userRepository.delete(userId);

      if (!isUserDeleted) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(
          responseFormat(false, {
            message: "User deletion failed !!!",
          })
        );
      }

      return res.status(StatusCodes.OK).json(
        responseFormat(true, {
          message: "Delete user successfully !!!",
        })
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
}

export default AuthController;
