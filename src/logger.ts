/* eslint-disable no-console */
export default class Logger {
  private static instance: Logger;

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(...message: (string | number)[]) {
    console.log(`[${new Date().toLocaleString()}]`, ...message);
  }

  error(message: string) {
    console.error(`[${new Date().toLocaleString()}]`, message);
  }
}
