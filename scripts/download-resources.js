// scripts/download-ffmpeg.js
import path from "path";
import https from "https";
import { execSync } from "child_process";
import {
    createWriteStream,
    unlinkSync,
    statSync,
    readdirSync,
    copyFileSync,
} from "fs";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const binaryDir = path.join(__dirname, "..", "src-tauri", "binaries");

const rustInfo = execSync("rustc -vV");
const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];
const extension = targetTriple === "x86_64-pc-windows-msvc" ? ".exe" : "";

const ffmpegBinary = path.join(binaryDir, `ffmpeg-${targetTriple}${extension}`);
const ffprobeBinary = path.join(
    binaryDir,
    `ffprobe-${targetTriple}${extension}`
);
const organizeBinary = path.join(
    binaryDir,
    `organize-${targetTriple}${extension}`
);

const libDir = path.join(__dirname, "..", "src-tauri", "lib");

if (!targetTriple) {
    console.error("Failed to determine platform target triple");
}

// Create directory if it doesn't exist
if (!fs.existsSync(binaryDir)) {
    fs.mkdirSync(binaryDir, { recursive: true });
}

if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
}

function getFFmpegInfo() {
    const rustInfo = execSync("rustc -vV");
    const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];

    if (targetTriple === "x86_64-pc-windows-msvc") {
        return {
            url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n7.1-latest-win64-lgpl-7.1.zip",
            outputPath: path.join(
                binaryDir,
                "ffmpeg-x86_64-pc-windows-msvc.zip"
            ),
            extractDir: binaryDir,
        };
    } else if (targetTriple === "aarch64-apple-darwin") {
        return {
            url: "https://github.com/simulacraliasing/ffmpeg-macos-build/releases/download/v7.1/ffmpeg71arm.zip",
            outputPath: path.join(binaryDir, "ffmpeg-aarch64-apple-darwin.zip"),
            extractDir: binaryDir,
        };
    } else if (targetTriple === "x86_64-apple-darwin") {
        return {
            url: "https://github.com/simulacraliasing/ffmpeg-macos-build/releases/download/v7.1/ffmpeg71intel.zip",
            outputPath: path.join(binaryDir, "ffmpeg-x86_64-apple-darwin.zip"),
            extractDir: binaryDir,
        };
    } else if (targetTriple === "x86_64-unknown-linux-gnu") {
        return {
            url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n7.1-latest-linux64-lgpl-7.1.tar.xz",
            outputPath: path.join(
                binaryDir,
                "ffmpeg-x86_64-unknown-linux-gnu.tar.xz"
            ),
            extractDir: binaryDir,
        };
    } else if (targetTriple === "aarch64-unknown-linux-gnu") {
        return {
            url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n7.1-latest-linuxarm64-lgpl-7.1.tar.xz",
            outputPath: path.join(
                binaryDir,
                "ffmpeg-aarch64-unknown-linux-gnu.tar.xz"
            ),
            extractDir: binaryDir,
        };
    } else {
        throw new Error(`Unsupported target triple: ${targetTriple}`);
    }
}

function getOrganizeInfo() {
    const rustInfo = execSync("rustc -vV");
    const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];

    if (targetTriple === "x86_64-pc-windows-msvc") {
        return {
            url: "https://github.com/simulacraliasing/organize/releases/download/v0.1.0/organize-x86_64-pc-windows-msvc.exe",
            outputPath: path.join(
                binaryDir,
                "organize-x86_64-pc-windows-msvc.exe"
            ),
        };
    } else if (targetTriple === "aarch64-apple-darwin") {
        return {
            url: "https://github.com/simulacraliasing/organize/releases/download/v0.1.0/organize-aarch64-apple-darwin",
            outputPath: path.join(binaryDir, "organize-aarch64-apple-darwin"),
        };
    } else if (targetTriple === "x86_64-apple-darwin") {
        return {
            url: "https://github.com/simulacraliasing/organize/releases/download/v0.1.0/organize-x86_64-apple-darwin",
            outputPath: path.join(binaryDir, "organize-x86_64-apple-darwin"),
        };
    } else if (targetTriple === "x86_64-unknown-linux-gnu") {
        return {
            url: "https://github.com/simulacraliasing/organize/releases/download/v0.1.0/organize-x86_64-unknown-linux-gnu",
            outputPath: path.join(
                binaryDir,
                "organize-x86_64-unknown-linux-gnu"
            ),
        };
    } else if (targetTriple === "aarch64-unknown-linux-gnu") {
        return {
            url: "https://github.com/simulacraliasing/organize/releases/download/v0.1.0/organize-aarch64-unknown-linux-gnu",
            outputPath: path.join(
                binaryDir,
                "organize-aarch64-unknown-linux-gnu"
            ),
        };
    } else {
        throw new Error(`Unsupported target triple: ${targetTriple}`);
    }
}

function getOrtInfo(targetTriple) {
    if (targetTriple == "x86_64-pc-windows-msvc") {
        return {
            url: "https://github.com/simulacraliasing/md5rs/releases/download/ort-prebuilt/ort-prebuilt-windows-amd64.zip",
            outputPath: path.join(libDir, "ort-prebuilt-windows-amd64.zip"),
        };
    } else if (targetTriple == "x86_64-unknown-linux-gnu") {
        return {
            url: "https://github.com/simulacraliasing/md5rs/releases/download/ort-prebuilt/ort-prebuilt-linux-x86_64.tar.xz",
            outputPath: path.join(libDir, "ort-prebuilt-linux-x86_64.tar.xz"),
        };
    } else if (targetTriple == "aarch64-apple-darwin") {
        return {
            url: "https://github.com/microsoft/onnxruntime/releases/download/v1.19.2/onnxruntime-osx-arm64-1.19.2.tgz",
            outputPath: path.join(libDir, "onnxruntime-osx-arm64-1.19.2.tgz"),
        };
    }
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

// Extract the downloaded file
async function extractFile(filePath, extractDir) {
    console.log(`Extracting ${filePath} to ${extractDir}...`);

    if (filePath.endsWith(".zip")) {
        if (process.platform === "win32") {
            execSync(
                `powershell -command "Expand-Archive -Path '${filePath}' -DestinationPath '${extractDir}' -Force"`
            );
        } else {
            execSync(`unzip -o "${filePath}" -d "${extractDir}"`);
        }
    } else if (filePath.endsWith(".tar.xz")) {
        execSync(`tar -xf "${filePath}" -C "${extractDir}"`);
    } else if (filePath.endsWith(".tgz")) {
        execSync(`tar -xzf "${filePath}" -C "${extractDir}"`);
    } else {
        throw new Error(`Unsupported file extension for ${filePath}`);
    }

    console.log("Extraction complete!");
}

// Helper function to find a file recursively
function findFileRecursive(dir, filename) {
    const files = readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            const found = findFileRecursive(filePath, filename);
            if (found) return found;
        } else if (file === filename) {
            return filePath;
        }
    }

    return null;
}

async function processFFmpegExtraction(extractDir, targetTriple) {
    if (targetTriple === "x86_64-pc-windows-msvc") {
        // Find the ffmpeg.exe in the extracted directory
        const ffmpegExe = findFileRecursive(extractDir, "ffmpeg.exe");
        if (ffmpegExe) {
            // Move ffmpeg.exe to the target location
            copyFileSync(
                ffmpegExe,
                path.join(binaryDir, `ffmpeg-${targetTriple}.exe`)
            );
            console.log("Copied ffmpeg.exe to windows directory");
        } else {
            throw new Error("Could not find ffmpeg.exe in extracted files");
        }

        const ffprobeExe = findFileRecursive(extractDir, "ffprobe.exe");
        if (ffprobeExe) {
            copyFileSync(
                ffprobeExe,
                path.join(binaryDir, `ffprobe-${targetTriple}.exe`)
            );
            console.log("Copied ffprobe.exe to windows directory");
        } else {
            throw new Error("Could not find ffprobe.exe in extracted files");
        }
    } else {
        // For macOS/Linux
        const ffmpegBin = findFileRecursive(extractDir, "ffmpeg");
        if (ffmpegBin) {
            let destPath = path.join(binaryDir, `ffmpeg-${targetTriple}`);
            copyFileSync(ffmpegBin, destPath);
            console.log(`Copied ffmpeg to ${targetTriple} directory`);

            // Make executable on non-Windows platforms
            execSync(`chmod +x ${destPath}`);
        } else {
            throw new Error("Could not find ffmpeg binary in extracted files");
        }

        const ffprobeBin = findFileRecursive(extractDir, "ffprobe");
        if (ffprobeBin) {
            let destPath = path.join(binaryDir, `ffprobe-${targetTriple}`);
            copyFileSync(ffprobeBin, destPath);
            console.log(`Copied ffprobe to ${targetTriple} directory`);

            // Make executable on non-Windows platforms
            execSync(`chmod +x ${destPath}`);
        } else {
            throw new Error("Could not find ffprobe binary in extracted files");
        }
    }
}

// Process ORT after extraction
async function processOrtExtraction(extractDir, targetTriple) {
    if (targetTriple === "x86_64-pc-windows-msvc") {
        // Copy all DLL files from the extracted directory to lib directory
        const copyDlls = (dir) => {
            const files = readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = statSync(filePath);

                if (stat.isDirectory()) {
                    copyDlls(filePath);
                } else if (file.endsWith(".dll")) {
                    copyFileSync(filePath, path.join(libDir, file));
                    console.log(`Copied ${file} to lib directory`);
                }
            }
        };

        copyDlls(extractDir);

        // Verify the main DLL was found
        if (!fs.existsSync(path.join(libDir, "onnxruntime.dll"))) {
            throw new Error(
                "Could not find onnxruntime.dll in extracted files"
            );
        }
    } else if (targetTriple === "x86_64-unknown-linux-gnu") {
        // Copy all .so files from the extracted directory to lib directory
        const copySoFiles = (dir) => {
            const files = readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = statSync(filePath);

                if (stat.isDirectory()) {
                    copySoFiles(filePath);
                } else if (file.endsWith(".so") || file.endsWith(".so.1")) {
                    copyFileSync(filePath, path.join(libDir, file));
                    console.log(`Copied ${file} to lib directory`);
                }
            }
        };

        copySoFiles(extractDir);

        // Verify the main .so was found
        if (!fs.existsSync(path.join(libDir, "libonnxruntime.so"))) {
            throw new Error(
                "Could not find libonnxruntime.so in extracted files"
            );
        }
    } else if (targetTriple === "aarch64-apple-darwin") {
        // Copy all .dylib files from the extracted directory to lib directory
        const copyDylibFiles = (dir) => {
            const files = readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = statSync(filePath);

                if (stat.isDirectory()) {
                    copyDylibFiles(filePath);
                } else if (file.endsWith(".dylib")) {
                    // For the main library, rename it to libonnxruntime.dylib
                    copyFileSync(filePath, path.join(libDir, file));
                    console.log(`Copied ${file} to lib directory`);
                }
            }
        };

        copyDylibFiles(extractDir);

        // Verify the main dylib was copied
        if (!fs.existsSync(path.join(libDir, "libonnxruntime.dylib"))) {
            throw new Error(
                "Could not find libonnxruntime dylib in extracted files"
            );
        }
    }
}

// Clean up temporary files
function cleanUp(filePath) {
    try {
        unlinkSync(filePath);
        console.log(`Cleaned up temporary file: ${filePath}`);
    } catch (err) {
        console.error(`Failed to clean up ${filePath}:`, err);
    }
}

// Download and extract FFmpeg
async function downloadFFmpeg() {
    if (fs.existsSync(ffmpegBinary) && fs.existsSync(ffprobeBinary)) {
        console.log("FFmpeg already exists, skipping download");
        return;
    }

    const { url, outputPath, extractDir } = getFFmpegInfo();

    try {
        console.log(`Downloading FFmpeg for ${targetTriple} from ${url}...`);
        await downloadFile(url, outputPath);
        console.log("Download complete!");

        await extractFile(outputPath, extractDir);
        await processFFmpegExtraction(extractDir, targetTriple);

        // Clean up the downloaded archive
        cleanUp(outputPath);

        console.log(
            "FFmpeg has been successfully installed for your platform!"
        );
    } catch (error) {
        console.error("Error downloading or extracting FFmpeg:", error);
        process.exit(1);
    }
}

async function downloadOrganize() {
    if (fs.existsSync(organizeBinary)) {
        console.log("Organize already exists, skipping download");
        return;
    }

    const { url, outputPath } = getOrganizeInfo();

    try {
        console.log(`Downloading Organize for ${targetTriple} from ${url}...`);
        await downloadFile(url, outputPath);
        console.log("Download complete!");

        if (targetTriple !== "x86_64-pc-windows-msvc") {
            // Make the downloaded file executable
            execSync(`chmod +x ${outputPath}`);
        }

        console.log(
            "Organize has been successfully installed for your platform!"
        );
    } catch (error) {
        console.error("Error downloading Organize:", error);
        process.exit(1);
    }
}

async function downloadOrt(targetTriple) {
    const { url, outputPath } = getOrtInfo(targetTriple);
    try {
        if (targetTriple == "x86_64-pc-windows-msvc") {
            const ortPath = path.join(libDir, "onnxruntime.dll");
            if (fs.existsSync(ortPath)) {
                console.log("ORT already exists, skipping download");
                return;
            }
        } else if (targetTriple == "x86_64-unknown-linux-gnu") {
            const ortPath = path.join(libDir, "libonnxruntime.so");
            if (fs.existsSync(ortPath)) {
                console.log("ORT already exists, skipping download");
                return;
            }
        } else if (targetTriple == "aarch64-apple-darwin") {
            const ortPath = path.join(libDir, "libonnxruntime.dylib");
            if (fs.existsSync(ortPath)) {
                console.log("ORT already exists, skipping download");
                return;
            }
        }
        console.log(`Downloading ORT for ${targetTriple} from ${url}...`);
        await downloadFile(url, outputPath);
        console.log("Download complete!");

        await extractFile(outputPath, libDir);
        await processOrtExtraction(libDir, targetTriple);

        cleanUp(outputPath);
    } catch (error) {
        console.error("Error downloading ORT:", error);
        process.exit(1);
    }
}

// Run the download process
downloadFFmpeg();

downloadOrganize();

downloadOrt(targetTriple);
