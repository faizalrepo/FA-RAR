import { ChatOllama } from "@langchain/ollama";
import {
  HumanMessage,
  ChatMessage,
  SystemMessage,
} from "@langchain/core/messages";
import c from "chalk";

import dotenv from "dotenv";
import { stringify } from "querystring";
dotenv.config();

const modelSelect = [
  // Reasoning Models
  "qwen3:1.7b", // 0
  "qwen3:4b", // 1
  "deepseek-r1:1.5b", // 2
  "phi4-mini-reasoning:latest", // 3

  // Regular Models
  "gemma3:1b", // 4
  "gemma3:4b", // 5
  "gemma3:4b-it-qat", // 6
];

async function chatResponse(req: any, res: any) {
  try {
    console.log(`\n\n${JSON.stringify(req.body)}\n\n`);

    const { content, model_number } = req.body;

    const model = new ChatOllama({
      model: modelSelect[model_number],
      baseUrl: "http://127.0.0.1:11434",
      temperature: 1,
      callbacks: [
        {
          handleLLMNewToken(token) {
            process.stdout.write(token);
          },
        },
      ],
    });

    console.log(
      `\n-- Model in use: ${c.magenta(model.model.replace(/:/g, " : "))} --\n`
    );

    const system_message = "Strictly respond under 20 words";

    console.log(c.redBright("[AGENT]:\n"));

    const response = await model.invoke([
      new SystemMessage(system_message),
      new HumanMessage(content),
    ]);

    let reasoning = null;
    let contentOut = response.content;
    const thinkMatch = String(response.content).match(
      /<think>([\s\S]*?)<\/think>/i
    );
    if (thinkMatch) {
      reasoning = thinkMatch[1].trim();
      // Everything after </think>
      const afterThink = String(response.content).split(/<\/think>/i)[1];
      contentOut = afterThink ? afterThink.trim() : "";
    }

    const resPack = {
      model: model.model,
      ...(reasoning !== null
        ? { reasoning, content: contentOut }
        : { response: response.content }),
    };

    res.status(200).send(resPack);

    console.log("\n");
  } catch (error) {
    console.log("Error: ", error);
  }
}

export { chatResponse };
