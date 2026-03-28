import { Router } from "express";
import ChatController from "../controllers/chat.controller.js";

const ChatRouter = Router();
ChatRouter.post("/send-message", ChatController.sendMessage);

export default ChatRouter;
