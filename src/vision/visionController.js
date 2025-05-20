import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import {
    HumanMessage,
    ChatMessage,
    SystemMessage,
} from "@langchain/core/messages";
import c from "chalk";
import fs from "fs";
import { pdfToPng } from "pdf-to-png-converter";
import { parse } from "json2csv";
import dotenv from "dotenv";
import { response } from "express";
import OpenAI from "openai";
import { Groq } from "groq-sdk";
dotenv.config();

const model = [
    "gemma3:4b", // 0
    "gemma3:4b-it-qat", // 1
    "granite3.2-vision", // 2
    "moondream", // 3
    "hf.co/unsloth/Qwen2.5-VL-7B-Instruct-GGUF:IQ2_M", // 4
    "qwen2.5vl:3b", // 5
];

const localModel_ls = async () => {
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

    // await convertPdfToPng();

    const convertImageToBase64 = (filePath) => {
        const imageBuffer = fs.readFileSync(filePath);
        return imageBuffer.toString("base64");
    };

    let promptText = `Return one JSON object per image or invoice, using consistent keys in every response to support CSV conversion. Detect and apply any handwritten corrections (strikethroughs) to original values. Format all dates with '-' as the separator. If a value is missing, set it to null. Each JSON object must include: 'Primary Account', 'Name', 'SSN', 'DOB', 'Email', 'Home Phone', 'Work Phone', 'Status', and 'Balance'. Ensure only valid emails are entered under the 'Email' key, and valid phone numbers under the 'Home Phone' and 'Work Phone' keys, respectively.`;

    const base64Image = convertImageToBase64(`./output/page_1.png`);

    let contents = [
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
    ];

    // const imageFiles = fs
    //     .readdirSync("./output")
    //     .filter((file) => file.endsWith(".png"));

    // for (const filename of imageFiles) {
    //     const imagePath = `./output/${filename}`;
    //     const base64Image = convertImageToBase64(imagePath);
    //     const imagePart = {
    //         type: "image_url",
    //         image_url: {
    //             url: `data:image/png;base64,${base64Image}`,
    //             detail: "high",
    //         },
    //     };
    //     contents.push(imagePart);
    // }

    const hum_mess = new HumanMessage({
        content: contents,
    });

    const response = await llm.invoke([hum_mess]);
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

const cloudModel_gg = async () => {
    try {
        const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

        // PDF → PNG
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

        await convertPdfToPng();

        // PNG → Base64
        function encodeImageToBase64(filePath) {
            const imageBuffer = fs.readFileSync(filePath);
            return imageBuffer.toString("base64");
        }

        const prompt = `Return one JSON object per image or invoice, using consistent keys in every response to support CSV conversion. Detect and apply any handwritten corrections (strikethroughs) to original values. Format all dates with '-' as the separator. If a value is missing, set it to null. Each JSON object must include: 'Primary Account', 'Name', 'SSN', 'DOB', 'Email', 'Home Phone', 'Work Phone', 'Status', and 'Balance'. Ensure only valid emails are entered under the 'Email' key, and valid phone numbers under the 'Home Phone' and 'Work Phone' keys, respectively.`;

        // const prompt = "Include every detail in the invoice.";

        let contents = [prompt];

        const imageFiles = fs
            .readdirSync("./output")
            .filter((file) => file.endsWith(".png"));

        imageFiles.forEach((filename) => {
            const imagePath = `./output/${filename}`;
            const base64Image = encodeImageToBase64(imagePath);
            const imagePart = {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/png",
                    detail: "high",
                },
            };
            contents.push(imagePart);
        });

        const modelName = [
            "gemini-2.5-pro-preview-05-06", // 0
            "gemini-2.5-flash-preview-04-17", // 1
            "gemini-2.0-flash", // 2
            "gemini-2.0-flash-lite", // 3
            "gemini-2.0-flash-thinking-exp-01-21", // 4
            "gemini-2.0-flash-live-preview-04-09", // 5
            "gemini-1.5-pro", // 6
            "gemini-1.5-flash", // 7
            "gemma-3-4b-it", // 8
            "gemma-3-12b-it", // 9
            "gemma-3-27b-it", // 10
            "pali-gemma", // 11
        ];

        const model = modelName[3];

        const result = await genAI.models.generateContent({
            model: model,
            config: {
                // systemInstruction: system,
                responseMimeType: "application/json",
            },
            contents: contents,
        });

        // for await (const chunk of result) {
        //   process.stdout.write(chunk.text);
        // }
        console.log(`\n${result.text}\n`);

        // const csv = parse(JSON.parse(result.text));
        // fs.writeFileSync("./output/output.csv", csv);

        const getUniqueFilename = () => {
            const baseFilename = `./output/${model}_output`;
            const extension = ".csv";
            let counter = 1;
            let filename = `${baseFilename}${extension}`;

            while (fs.existsSync(filename)) {
                counter++;
                filename = `${baseFilename}_${counter}${extension}`;
            }

            return filename;
        };

        const outputFilename = getUniqueFilename();
        const csv = parse(JSON.parse(result.text));
        fs.writeFileSync(outputFilename, csv);
        console.log(`CSV file written to: ${outputFilename}`);

        imageFiles.forEach((filename) => {
            const imagePath = `./output/${filename}`;
            fs.unlinkSync(imagePath);
        });
        console.log("\nAll PNGs deleted\n");
    } catch (error) {
        console.error("Error generating content:", error);
    }
};

const cloudModel_oai = async () => {
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // PDF → PNG
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

        await convertPdfToPng();

        // PNG → Base64
        function encodeImageToBase64(filePath) {
            const imageBuffer = fs.readFileSync(filePath);
            return imageBuffer.toString("base64");
        }

        const prompt = `Return one JSON object per image or invoice, using consistent keys in every response to support CSV conversion. Always start with [ without mentioning "records" (direct JSON to CSV). Detect and apply any handwritten corrections (strikethroughs) to original values. Format all dates with '-' as the separator. If a value is missing, set it to null. Each JSON object must include: 'Primary Account', 'Name', 'SSN', 'DOB', 'Email', 'Home Phone', 'Work Phone', 'Status', and 'Balance'. Ensure only valid emails are entered under the 'Email' key, and valid phone numbers under the 'Home Phone' and 'Work Phone' keys, respectively.`;

        const content = [
            {
                type: "input_text",
                text: prompt,
            },
        ];

        const imageFiles = fs
            .readdirSync("./output")
            .filter((file) => file.endsWith(".png"));

        for (const filename of imageFiles) {
            const imagePath = `./output/${filename}`;
            const base64Image = encodeImageToBase64(imagePath);
            content.push({
                type: "input_image",
                image_url: `data:image/png;base64,${base64Image}`,
                detail: "high",
            });
            // console.log(`\nInjected - ${filename} - to Model input.\n`);
        }

        let messages = [
            { role: "system", content: prompt },
            { role: "user", content: content },
        ];

        const modelName = "o4-mini";

        const completion = await openai.responses.create({
            model: modelName,
            input: messages,
            text: {
                format: {
                    type: "json_object",
                },
            },
        });

        const resultText = completion.output_text;
        // const resultText = completion.choices[0].message.content;
        console.log(`\n${resultText}\n`);

        const getUniqueFilename = () => {
            const baseFilename = `./output/${modelName}_output`;
            const extension = ".csv";
            let counter = 1;
            let filename = `${baseFilename}${extension}`;
            while (fs.existsSync(filename)) {
                counter++;
                filename = `${baseFilename}_${counter}${extension}`;
            }
            return filename;
        };

        const outputFilename = getUniqueFilename();
        const csv = parse(JSON.parse(resultText));
        fs.writeFileSync(outputFilename, csv);
        console.log(`CSV file written to: ${outputFilename}`);

        imageFiles.forEach((filename) => {
            const imagePath = `./output/${filename}`;
            fs.unlinkSync(imagePath);
        });
        console.log("\nAll PNGs deleted\n");
    } catch (error) {
        console.error("Error generating content:", error);
    }
};

const cloudModel_grq = async () => {
    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        // PDF → PNG
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

        await convertPdfToPng();

        // PNG → Base64
        function encodeImageToBase64(filePath) {
            const imageBuffer = fs.readFileSync(filePath);
            return imageBuffer.toString("base64");
        }

        const prompt = `Return one JSON object per image or invoice, using consistent keys in every response to support CSV conversion. Always start with [ without mentioning "records" (direct JSON to CSV). Detect and apply any handwritten corrections (strikethroughs) to original values. Format all dates with '-' as the separator. If a value is missing, set it to null. Each JSON object must include: 'Primary Account', 'Name', 'SSN', 'DOB', 'Email', 'Home Phone', 'Work Phone', 'Status', and 'Balance'. Ensure only valid emails are entered under the 'Email' key, and valid phone numbers under the 'Home Phone' and 'Work Phone' keys, respectively.`;

        const imageFiles = fs
            .readdirSync("./output")
            .filter((file) => file.endsWith(".png"));

        const content = [
            {
                type: "text",
                text: prompt,
            },
        ];

        for (const filename of imageFiles) {
            const imagePath = `./output/${filename}`;
            const base64Image = encodeImageToBase64(imagePath);
            content.push({
                type: "image_url",
                image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                },
            });
        }

        const messages = [
            {
                role: "user",
                content: content,
            },
        ];

        const modelName = "meta-llama/llama-4-scout-17b-16e-instruct";

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: modelName,
            response_format: { type: "json_schema" },
        });

        const resultText = chatCompletion.choices[0].message.content;
        console.log(`\n${resultText}\n`);

        const getUniqueFilename = () => {
            const baseFilename = `./output/${modelName.replace(
                /[\/:]/g,
                "_"
            )}_output`;
            const extension = ".csv";
            let counter = 1;
            let filename = `${baseFilename}${extension}`;
            while (fs.existsSync(filename)) {
                counter++;
                filename = `${baseFilename}_${counter}${extension}`;
            }
            return filename;
        };

        const outputFilename = getUniqueFilename();
        const csv = parse(JSON.parse(resultText));
        fs.writeFileSync(outputFilename, csv);
        console.log(`CSV file written to: ${outputFilename}`);

        imageFiles.forEach((filename) => {
            const imagePath = `./output/${filename}`;
            fs.unlinkSync(imagePath);
        });
        console.log("\nAll PNGs deleted\n");
    } catch (error) {
        console.error("Error generating content:", error);
    }
};

const cloudModel_gg_2 = async () => {
    try {
        const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

        // PDF → PNG
        const convertPdfToPng = async () => {
            const pdfFilePath = "src/vision/images/eleos_invoices.pdf";
            const pngPages = await pdfToPng(pdfFilePath, {
                viewportScale: 2.0,
                verbosityLevel: 0,
                outputFolder: "./output",
                outputFileMaskFunc: (pageNumber) =>
                    `page_${String(pageNumber).padStart(2, "0")}.png`,
            });
            console.log("\nPDF → PNG Conversion Complete ...");
        };

        await convertPdfToPng();

        // PNG → Base64
        function encodeImageToBase64(filePath) {
            const imageBuffer = fs.readFileSync(filePath);
            return imageBuffer.toString("base64");
        }

        const prompt = `You are given an image. Extract and return a single JSON object using consistent keys for CSV compatibility.

Requirements:

1. Use the following keys only:
   - "page_no"
   - "primary_account"
   - "name"
   - "ssn_l4d"
   - "dob"
   - "email"
   - "home-phone"
   - "work-phone"
   - "last_visit"
   - "status"
   - "balance"
   - "new_last_visit"
   - "new_balance"

2. Date Format:
   - Input format is MM/DD/YYYY
   - Use '-' as separator

3. If a value is missing, assign null.

4. Corrections Handling:
   - If there are handwritten strikethrough corrections on "last_visit" or "balance", apply them to "new_last_visit" and "new_balance".
   - If no corrections are present, set "new_last_visit" = "last_visit" and "new_balance" = "balance".

5. Email:
   - Must be a valid email format.
   - If invalid or not found, set as null.

6. Phone Numbers:
   - "home-phone" and "work-phone" must be in the format 123-456-7890.
   - Do not include brackets or spaces.
   - If invalid or missing, set as null.

7. Other:
   - Only return the last 4 digits as "ssn_l4d".
`;

        const modelName = [
            "gemini-2.5-pro-preview-05-06", // 0
            "gemini-2.5-flash-preview-04-17", // 1
            "gemini-2.0-flash", // 2
            "gemini-2.0-flash-lite", // 3
            "gemini-2.0-flash-thinking-exp-01-21", // 4
            "gemini-2.0-flash-live-preview-04-09", // 5
            "gemini-1.5-pro", // 6
            "gemini-1.5-flash", // 7
            "gemma-3-4b-it", // 8
            "gemma-3-12b-it", // 9
            "gemma-3-27b-it", // 10
            "pali-gemma", // 11
        ];

        const model = modelName[3];

        const allResults = [];

        const imageFiles = fs
            .readdirSync("./output")
            .filter((file) => file.endsWith(".png"));

        for (const filename of imageFiles) {
            const imagePath = `./output/${filename}`;
            const base64Image = encodeImageToBase64(imagePath);

            const contents = [
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: "image/png",
                        detail: "high",
                    },
                },
            ];

            console.log(`\nProcessing ${filename} ...\n`);

            const result = await genAI.models.generateContent({
                model: model,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0,
                },
                contents: contents,
            });

            console.log(`\n\n${result.text}\n\n`);

            try {
                const parsedResult = JSON.parse(result.text);
                allResults.push(parsedResult);
            } catch (parseError) {
                console.error(
                    `Error parsing JSON for ${filename}:`,
                    parseError
                );
            }
        }

        const getUniqueFilename = () => {
            const baseFilename = `./output/${model}_output`;
            const extension = ".csv";
            let counter = 1;
            let filename = `${baseFilename}${extension}`;

            while (fs.existsSync(filename)) {
                counter++;
                filename = `${baseFilename}_${counter}${extension}`;
            }

            return filename;
        };

        const outputFilename = getUniqueFilename();
        const csv = parse(allResults);
        fs.writeFileSync(outputFilename, csv);
        console.log(`CSV file written to: ${outputFilename}`);

        imageFiles.forEach((filename) => {
            const imagePath = `./output/${filename}`;
            fs.unlinkSync(imagePath);
        });
        console.log("\nAll PNGs deleted\n");
    } catch (error) {
        console.error("Error generating content:", error);
    }
};

// localModel_ls();
// cloudModel_ls();
// cloudModel_gg();
// cloudModel_oai();
// cloudModel_grq();
cloudModel_gg_2();
