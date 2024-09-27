import Axios, { AxiosInstance } from "axios";
import { MESSENGER_API_URL } from "./message.config.js";

export interface Message {
  room: string;
  msg: string;
  sender: string;
}

export default class MessageService {
  private axios: AxiosInstance;

  constructor() {
    this.axios = Axios.create({
      baseURL: `${MESSENGER_API_URL}/message`
    });
  }

  async sendMessageQueue(message: Message) {
    this.axios.post("/queue", message);
  }
}
