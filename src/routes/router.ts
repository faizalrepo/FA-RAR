import express, { Request, Response } from "express";
import { chatResponse } from "../chat/chatController.js";
import c from "chalk";

const app = express();
const port = 4000;

app.use(express.json());

app.get("/api/chat", chatResponse);

app.listen(port, () => {
  console.log(c.yellowBright(`\n{ Server running on port ${port} }\n`));
});
