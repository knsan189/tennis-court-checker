import crypto from "crypto";
import axios, { AxiosResponse } from "axios";

interface MessageOptions {
  message: string;
  replyTo?: number | null;
  referenceId?: string;
  silent?: boolean;
}

class NextcloudTalkBot {
  private baseUrl: string;

  private botToken: string;

  private sharedSecret: string;

  constructor(baseUrl: string, botToken: string, sharedSecret: string) {
    this.baseUrl = baseUrl;
    this.botToken = botToken;
    this.sharedSecret = sharedSecret;
  }

  /**
   * 메시지 서명을 생성하는 메서드
   * @param randomValue 랜덤 문자열
   * @param requestBody 요청 본문
   * @returns HMAC-SHA256 서명
   */
  private generateSignature(randomValue: string, requestBody: string): string {
    return crypto
      .createHmac("sha256", this.sharedSecret)
      .update(randomValue + requestBody)
      .digest("hex");
  }

  /**
   * 랜덤 값 생성 메서드
   * @returns Base64로 인코딩된 랜덤 문자열
   */
  private generateRandomValue(): string {
    return crypto.randomBytes(32).toString("base64");
  }

  /**
   * 공통 API 요청 메서드
   * @param method HTTP 메서드
   * @param endpoint API 엔드포인트
   * @param requestBody 요청 본문
   * @returns 서버 응답
   */
  private async makeApiRequest(
    method: "POST" | "DELETE",
    endpoint: string,
    requestBody: string,
    message: string
  ): Promise<AxiosResponse> {
    const randomValue = this.generateRandomValue();
    const signature = this.generateSignature(randomValue, message);

    try {
      return await axios({
        method,
        url: `${this.baseUrl}/ocs/v2.php/apps/spreed/api/v1${endpoint}`,
        data: requestBody,
        headers: {
          "OCS-APIRequest": "true",
          "Content-Type": "application/json",
          "X-Nextcloud-Talk-Bot-Random": randomValue,
          "X-Nextcloud-Talk-Bot-Signature": signature
        }
      });
    } catch (error) {
      console.error(
        "API 요청 실패:",
        error instanceof axios.AxiosError ? error.response?.data : error
      );

      throw error;
    }
  }

  /**
   * 채팅 메시지 전송 메서드
   * @param messageOptions 메시지 옵션
   * @returns 서버 응답
   */
  async sendMessage(messageOptions: MessageOptions): Promise<AxiosResponse> {
    const {
      message,
      replyTo = null,
      referenceId = crypto.randomBytes(16).toString("hex"),
      silent = false
    } = messageOptions;

    if (!message) {
      throw new Error("메시지는 비워둘 수 없습니다");
    }

    const requestBody = JSON.stringify({
      message,
      replyTo,
      referenceId,
      silent
    });

    return this.makeApiRequest("POST", `/bot/${this.botToken}/message`, requestBody, message);
  }

  // /**
  //  * 메시지에 리액션 추가 메서드
  //  * @param options 리액션 옵션
  //  * @returns 서버 응답
  //  */
  // async addReaction(options: ReactionOptions): Promise<AxiosResponse> {
  //   const { messageId, reaction } = options;
  //   const requestBody = JSON.stringify({ reaction });

  //   return this.makeApiRequest("POST", `/bot/${this.botToken}/reaction/${messageId}`, requestBody);
  // }

  // /**
  //  * 메시지의 리액션 삭제 메서드
  //  * @param options 리액션 옵션
  //  * @returns 서버 응답
  //  */
  // async deleteReaction(options: ReactionOptions): Promise<AxiosResponse> {
  //   const { messageId, reaction } = options;
  //   const requestBody = JSON.stringify({ reaction });

  //   return this.makeApiRequest(
  //     "DELETE",
  //     `/bot/${this.botToken}/reaction/${messageId}`,
  //     requestBody
  //   );
  // }
}

export default NextcloudTalkBot;
