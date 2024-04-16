import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad,
  BeforeInsert,
} from "typeorm";

import bcrypt from "bcryptjs";

export enum RoleEnumType {
  USER = "user",
  ADMIN = "admin",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Index("email_index")
  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ default: null, nullable: true })
  refreshToken!: string;

  @Column({
    type: "enum",
    enum: RoleEnumType,
    default: RoleEnumType.USER,
  })
  role!: RoleEnumType.USER;

  @Column({ unique: true })
  phone!: string;

  @Column({ type: "date" })
  dob!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  toJSON() {
    return {
      ...this,
      password: undefined,
      role: undefined,
      refreshToken: undefined,
      tempPassword: undefined,
    };
  }

  // ? Hash password before saving to database
  private tempPassword: string = "";
  @AfterLoad()
  storeOriginalPassword() {
    this.tempPassword = this.password;
  }

  @BeforeInsert()
  public async hashPassword() {
    if (this.password && this.password !== this.tempPassword) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  // ? Validate password
  async comparePassword(password: string) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      console.log(error);
    }
  }
}
