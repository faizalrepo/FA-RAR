import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  HumanMessage,
  ChatMessage,
  SystemMessage,
} from "@langchain/core/messages";
import c from "chalk";
import fs from "fs";
import { pdfToPng } from "pdf-to-png-converter";
import dotenv from "dotenv";
dotenv.config();

const model = [
  "gemma3:4b", // 0
  "gemma3:4b-it-qat", // 1
  "granite3.2-vision", // 2
  "moondream", // 3
  "hf.co/unsloth/Qwen2.5-VL-7B-Instruct-GGUF:IQ2_M", // 4
];

console.log("\n");

const localModel_ls = () => {
  const convertPdfToPng = async () => {
    const pdfFilePath = "src/vision/images/eleos_invoices.pdf";

    const pngPages = await pdfToPng(pdfFilePath, {
      viewportScale: 2.0,
      verbosityLevel: 0,
      outputFolder: "./output",
      outputFileMaskFunc: (pageNumber) => `page_${pageNumber}.png`,
    });

    console.log("Conversion complete: ", pngPages);
  };

  const convertImageToBase64 = async (filePath) => {
    const imageBuffer = await fs.readFile(filePath);
    return imageBuffer.toString("base64");
  };

  const llm = new ChatOllama({
    model: model[0],
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
          image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: "high",
          },
        },
        {
          type: "text",
          text: promptText,
        },
      ],
    });
  };

  const getVisionResponse = async () => {
    await convertPdfToPng();

    const b64image = await convertImageToBase64(
      "src/vision/images/eleos-invoice-1.png"
    );
    const query = createVisionPrompt(
      b64image,
      "when was the first visit and the second? their birth date?"
    );

    const response = await llm.invoke([query]);
    // console.log(response.content);
    console.log("\n");
  };

  console.log(
    `\nVision Model in use: ${c.magenta(llm.model.replace(/:/g, " : "))}\n`
  );

  getVisionResponse();
};

const cloudModel_ls = async () => {
  const vision = new ChatGoogleGenerativeAI({
    model: "gemma3:27b-it",
    maxOutputTokens: 2048,
    streaming: true,
    callbacks: [
      {
        handleLLMNewToken(token) {
          process.stdout.write(token);
        },
      },
    ],
  });
  const image = fs
    .readFileSync("src/vision/images/eleos-invoice-1.png")
    .toString("base64");
  const input = [
    new HumanMessage({
      content: [
        {
          type: "text",
          text: "when was the first visit and the second? their birth date? what was their registered date?",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${image}`,
            detail: "high",
          },
        },
      ],
    }),
  ];

  const res = await vision.invoke(input);
  console.log("\n");
};

const cloudModel = async () => {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });

  const base64Image = fs
    .readFileSync("src/vision/images/eleos-invoice-1.png")
    .toString("base64");
  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: "image/png",
    },
  };

  const prompt = "what is this?";

  const resultStream = await model.generateContentStream([prompt, imagePart]);

  for await (const chunk of resultStream.stream) {
    process.stdout.write(chunk.text());
  }

  // const result = await model.generateContent([prompt, imagePart]);
  // console.log(result.response.text());
};

cloudModel();
