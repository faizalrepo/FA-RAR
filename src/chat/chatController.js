// @ts-check

import { ChatOllama } from "@langchain/ollama";
import {
  HumanMessage,
  ChatMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { OpenAI } from "openai";
import c from "chalk";

import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI();

const modelSelect = [
  "qwen3:4b", // 0
  "granite3.2:2b", // 1
  "smallthinker:3b-preview-q4_K_M", // 2
  "deepseek-r1:1.5b", // 3
  "cogito:3b", // 4
  "gemma3:1b", // 5
  "gemma3:1b-it-fp16", // 6
  "gemma3:4b", // 7
  "gemma3:4b-it-qat", // 8
  "llama3.2:3b-instruct-q4_K_M", // 9
  "deepseek-r1:7b", // 10
  ///////////////////////////
  "gpt-4.1", // 11
  "gpt-4.1-mini", // 12
  "gpt-4.1-nano", // 13
  "o3-mini", // 14
  "o4-mini", // 15
];

async function multiModel() {
  try {
    let modelNumber = 7

    const modelName = modelSelect[modelNumber];

    const model = new ChatOllama({
      model: modelName,
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

    console.log(`\n-- Model in use: ${c.magenta(model.model.replace(/:/g, " : "))} --\n`);

    const system_message =
      "Respond exactly in what the user asks, not more than that. Be concise";

    const user_input = "IPL trophy winners list from 2008 to 2021";

    console.log(c.redBright("[AGENT]:\n"));
    const response = await model.invoke([
      new SystemMessage(system_message),
      new HumanMessage(user_input),
    ]);
    console.log("\n");
  } catch (error) {
    console.log("Error: ", error);
  }
}

multiModel();
