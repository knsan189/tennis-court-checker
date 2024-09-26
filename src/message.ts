import Axios, { AxiosInstance } from "axios";
import { API_SERVER_URL } from "./config.js";

export interface Message {
  room: string;
  msg: string;
  sender: string;
}

export default class MessageService {
  private axios: AxiosInstance;

  constructor() {
    this.axios = Axios.create({
      baseURL: `${API_SERVER_URL}/message`
    });
  }

  async sendMessageQueue(message: Message) {
    this.axios.post("/queue", message);
  }
}
