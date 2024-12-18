import express from "express";
import Logger from "./logger.js";
import courtRouter from "../court/court.router.js";
import nextCloudRouter from "../nextcloud/nextcloud.router.js";

const app = express();
const logger = Logger.getInstance();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  logger.log(`[${req.method}] ${req.url}`);
  next();
});

app.use("/court", courtRouter);
app.use("/webhook", nextCloudRouter);

export default app;
