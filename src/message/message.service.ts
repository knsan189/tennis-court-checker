import Axios, { AxiosInstance } from "axios";
import { MESSENGER_API_URL } from "./message.config.js";
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
      baseURL: `${MESSENGER_API_URL}/message`
    });
  }

  async sendMessageQueue(message: Message) {
    try {
      this.axios.post("/queue", message);
    } catch (error) {
      this.logger.error("메시지 전송 실패");
      if (error instanceof Error) {
        this.logger.error(error.message);
      }
    }
  }

  public static getInstance() {
    return new MessageService();
  }
}
