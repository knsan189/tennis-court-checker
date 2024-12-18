import { INTERVAL_TIME, LISTEN_PORT } from "./app/config.js";
import CourtBot from "./court/court.bot.js";
import app from "./app/app.js";
import Logger from "./app/logger.js";

const logger = Logger.getInstance();

app.listen(LISTEN_PORT, () => {
  logger.log("Server Listening Port :", LISTEN_PORT);
});

const bot1 = new CourtBot({
  courtType: "8",
  courtNumbers: ["07", "08", "09", "10", "11", "12", "13", "14"],
  courtName: "새물공원"
});

// const bot2 = new CourtBot({
//   courtType: "9",
//   courtNumbers: ["04", "05", "06", "07"],
//   courtName: "서조체육시설"
// });

const startCheck = () => {
  const date = new Date();
  const thisMonth = date.getMonth() + 1;
  const thisYear = date.getFullYear();

  const targetCalendars = [
    { month: thisMonth, year: thisYear },
    {
      month: thisMonth > 11 ? 1 : thisMonth + 1,
      year: thisMonth > 11 ? thisYear + 1 : thisYear
    }
  ];

  // bot2.init(targetCalendars);
  bot1.init(targetCalendars);
};

setInterval(() => startCheck(), 1000 * 60 * Number(INTERVAL_TIME));
startCheck();
