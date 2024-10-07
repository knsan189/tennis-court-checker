/* eslint-disable no-console */
export default class Logger {
  private header?: string;

  public static getInstance() {
    return new Logger();
  }

  log(...message: (string | number)[]) {
    if (this.header) console.log(`[${new Date().toLocaleString()}]`, this.header, ...message);
    else console.log(`[${new Date().toLocaleString()}]`, ...message);
  }

  setHeader(header: string) {
    this.header = header;
  }

  error(message: string) {
    console.error(`[${new Date().toLocaleString()}]`, message);
  }
}
