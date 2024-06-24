/* eslint-disable no-console */
export default class Logger {
  private static instance: Logger;

  dateString: string;

  private constructor() {
    this.dateString = `[${new Date().toLocaleString()}]`;
  }

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(message: string) {
    console.log(this.dateString, message);
  }

  error(message: string) {
    console.error(this.dateString, message);
  }
}
