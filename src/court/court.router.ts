import { Router } from "express";
import CourtService from "./court.service.js";
import Logger from "../app/logger.js";

const courtRouter = Router();
const courtService = CourtService.getInstance();
const logger = Logger.getInstance();

courtRouter.get("/", (req, res) => {
  try {
    const courts = courtService.getLatestResponse();
    res.send({ data: courts, code: 200 });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
      res.status(500).send({ data: error.message, code: 500 });
      return;
    }
    logger.error(error);
  }
});

export default courtRouter;
