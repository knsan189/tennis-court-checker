import { INTERVAL_TIME, LISTEN_PORT } from "./app/config.js";
import CourtBot from "./court/court.bot.js";
import app from "./app/app.js";
import Logger from "./app/logger.js";
import { getTargetMonth } from "./court/utils/getTargetMonth.js";

const logger = Logger.getInstance();

app.listen(LISTEN_PORT, () => {
  logger.log("Server Listening Port :", LISTEN_PORT);
});

const bot1 = new CourtBot({
  courtType: "8",
  courtNumbers: ["07", "08", "09", "10", "11", "12", "13", "14"],
  placeName: "새물공원"
});

// const bot2 = new CourtBot({
//   courtType: "9",
//   courtNumbers: ["04", "05", "06", "07"],
//   courtName: "서조체육시설"
// });

const startCheck = () => {
  bot1.init(getTargetMonth());
};

setInterval(() => startCheck(), 1000 * 60 * Number(INTERVAL_TIME));
startCheck();
