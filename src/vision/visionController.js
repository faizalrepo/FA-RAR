import { ChatOllama } from "@langchain/ollama";
import {
  HumanMessage,
  ChatMessage,
  SystemMessage,
} from "@langchain/core/messages";
import c from "chalk";
import fs from "fs/promises";

const model = "gemma3:4b";
const model2 = "gemma3:4b-it-qat";
const model3 = "granite3.2-vision";

const convertImageToBase64 = async (filePath) => {
  const imageBuffer = await fs.readFile(filePath);
  return imageBuffer.toString("base64");
};

const llm = new ChatOllama({
  model: model3,
  baseUrl: "http://127.0.0.1:11434",
  callbacks: [
    {
      handleLLMNewToken(token) {
        process.stdout.write(token);
      },
    },
  ],
});

const createVisionPrompt = (base64Image, promptText) => {
  return new HumanMessage({
    content: [
      {
        type: "image_url",
        image_url: `data:image/png;base64,${base64Image}`,
      },
      {
        type: "text",
        text: promptText,
      },
    ],
  });
};

const getVisionResponse = async () => {
  const b64image = await convertImageToBase64(
    "src/vision/images/eleos-invoice-1.png"
  );
  const query = createVisionPrompt(
    b64image,
    "give both: first visit and last visit?"
  );

  const response = await llm.invoke([query]);
  // console.log(response.content);
  console.log("\n");
};

console.log(
  `\nVision Model in use: ${c.magenta(llm.model.replace(/:/g, " : "))}\n`
);

getVisionResponse();
