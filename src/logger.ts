export default class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(message: string) {
    console.log(`[${new Date().toLocaleString()}]`, message);
  }

  error(message: string) {
    console.error(`[${new Date().toLocaleString()}]`, message);
  }
}
