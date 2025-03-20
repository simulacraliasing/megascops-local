// scripts/download-ffmpeg.js
import path from "path";
import https from "https";
import { execSync } from "child_process";
import { createWriteStream } from "fs";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rustInfo = execSync("rustc -vV");
const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];

const modelsDir = path.join(__dirname, "..", "src-tauri", "models");

// Create directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

// Download file from URL
async function downloadFile(fileUrl, outputPath) {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(outputPath);

        const handleRedirect = (response) => {
            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                const newUrl = new URL(
                    response.headers.location,
                    fileUrl
                ).toString();
                https.get(newUrl, handleRedirect).on("error", reject);
            } else if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
            } else {
                response.pipe(file);
                file.on("finish", () => {
                    file.close();
                    resolve();
                });
            }
        };

        https.get(fileUrl, handleRedirect).on("error", (err) => {
            fs.unlink(outputPath, () => {});
            reject(err);
        });
    });
}

function getModelInfo(targetTriple) {
    if (
        targetTriple == "x86_64-apple-darwin" ||
        targetTriple == "aarch64-apple-darwin"
    ) {
        return [
            {
                url: "https://huggingface.co/Simulacraliasing/Megadetector/resolve/main/MDV6-yolov9e-1280_d_pp.onnx?download=true",
                outputPath: path.join(modelsDir, "MDV6-yolov9e-1280_d_pp.onnx"),
            },
            {
                url: "https://huggingface.co/Simulacraliasing/Megadetector/resolve/main/md_v5a_d_pp.onnx?download=true",
                outputPath: path.join(modelsDir, "md_v5a_d_pp.onnx"),
            },
        ];
    } else {
        return [
            {
                url: "https://huggingface.co/Simulacraliasing/Megadetector/resolve/main/MDV6-yolov9e-1280_d_pp.onnx?download=true",
                outputPath: path.join(modelsDir, "MDV6-yolov9e-1280_d_pp.onnx"),
            },
            {
                url: "https://huggingface.co/Simulacraliasing/Megadetector/resolve/main/md_v5a_d_pp_fp16.onnx?download=true",
                outputPath: path.join(modelsDir, "md_v5a_d_pp_fp16.onnx"),
            },
        ];
    }
}

async function downloadModels(targetTriple) {
    const modelInfo = getModelInfo(targetTriple);

    for (let i = 0; i < modelInfo.length; i++) {
        const { url, outputPath } = modelInfo[i];
        try {
            if (fs.existsSync(outputPath)) {
                console.log("Model already exists, skipping download");
                continue;
            }
            console.log(`Downloading model for ${targetTriple} from ${url}...`);
            await downloadFile(url, outputPath);
            console.log("Download complete!");
        } catch (error) {
            console.error("Error downloading model:", error);
            process.exit(1);
        }
    }
}

downloadModels(targetTriple);
