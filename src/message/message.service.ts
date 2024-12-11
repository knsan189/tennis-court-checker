import Axios, { AxiosInstance } from "axios";
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "./message.config.js";
import Logger from "../app/logger.js";

export interface Message {
  room: string;
  msg: string;
  sender: string;
}

export default class MessageService {
  private axios: AxiosInstance;

  private logger = Logger.getInstance();

  constructor() {
    this.axios = Axios.create({
      baseURL: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
    });
  }

  public static getInstance() {
    return new MessageService();
  }

  private splitMsgMaxLength(msg: string): string[] {
    const splitMsg = [];
    let start = 0;
    let end = 4096;
    while (start < msg.length) {
      splitMsg.push(msg.substring(start, end));
      start = end;
      end += 4096;
    }
    return splitMsg;
  }

  async sendMessage(message: Message) {
    if (message.msg.length > 4096) {
      const splitMsg = this.splitMsgMaxLength(message.msg);
      splitMsg.forEach((msg) => {
        this.axios.post("/sendMessage", {
          chat_id: TELEGRAM_CHAT_ID,
          text: msg
        });
      });
      return;
    }
    this.axios.post("/sendMessage", {
      chat_id: TELEGRAM_CHAT_ID,
      text: message.msg
    });
  }
}
