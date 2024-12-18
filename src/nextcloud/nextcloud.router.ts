import express from "express";
import crypto from "crypto";

const verifySignature = (sharedSecret: string) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const random = req.header("X-Nextcloud-Talk-Random");
    const signature = req.header("X-Nextcloud-Talk-Signature");

    if (!random || !signature) {
      res.status(401).json({ error: "Missing authentication headers" });
      return;
    }

    const body = JSON.stringify(req.body);
    const digest = crypto
      .createHmac("sha256", sharedSecret)
      .update(random + body)
      .digest("hex");

    if (digest !== signature.toLowerCase()) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    next();
  };
};

const nextCloudRouter = express.Router();
const BOT_SECRET = "5QR9Xt4kZmN7pL2wX6yH3fA8uE1jB0sDdqertvadfa";

// 메시지 처리 핸들러
async function handleNewMessage(event: any) {
  const { actor, object, target } = event;

  console.log("New message received:", {
    from: actor.name,
    content: JSON.parse(object.content).message,
    room: target.name
  });

  // 여기에 메시지 처리 로직 구현
  // 예: 특정 명령어에 응답, AI 처리 등
}

// 봇 참가 이벤트 핸들러
async function handleBotJoined(event: any) {
  const { actor, object } = event;

  console.log("Bot joined room:", {
    botName: actor.name,
    room: object.name
  });

  // 여기에 봇 참가 시 필요한 초기화 로직 구현
  // 예: 환영 메시지 전송, 룸 설정 등
}

// 봇 퇴장 이벤트 핸들러
async function handleBotLeft(event: any) {
  const { actor, object } = event;

  console.log("Bot left room:", {
    botName: actor.name,
    room: object.name
  });

  // 여기에 봇 퇴장 시 필요한 정리 로직 구현
  // 예: 리소스 정리, 데이터 저장 등
}

nextCloudRouter.post("", verifySignature(BOT_SECRET), async (req, res) => {
  const event = req.body;

  try {
    switch (event.type) {
      case "Create": // 새 메시지 수신
        await handleNewMessage(event);
        break;

      case "Join": // 봇이 채팅방에 추가됨
        await handleBotJoined(event);
        break;

      case "Leave": // 봇이 채팅방에서 제거됨
        await handleBotLeft(event);
        break;

      default:
        console.log("Unknown event type:", event.type);
    }

    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default nextCloudRouter;
