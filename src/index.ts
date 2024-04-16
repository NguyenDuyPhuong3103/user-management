import express, { Application } from "express";
import morgan from "morgan";
import { createConnection } from "typeorm";
import Router from "./routes";
import dbConfig from "./config/database";
import YAML from "yaml";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import path from "path";
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app: Application = express();

const PORT = process.env.PORT || 8000;

const file = fs.readFileSync(path.resolve("swagger.yaml"), "utf8");
const swaggerDocument = YAML.parse(file);

app.use(cookieParser());
app.use(express.json());
app.use(morgan("tiny"));
app.use(express.static("public"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api", Router);

createConnection(dbConfig)
  .then((_connection) => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.log("Unable to connect to db", err);
    process.exit(1);
  });
