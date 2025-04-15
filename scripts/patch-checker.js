import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const binaryDir = path.join(__dirname, "..", "src-tauri", "binaries");

const checkerDir = path.join(__dirname, "..", "patch", "checker");

// Change directory to patch/checker
process.chdir(checkerDir);

// Build the release version
console.log("Building checker in release mode...");
execSync("cargo build -r", { stdio: "inherit" });

if (!fs.existsSync(binaryDir)) {
    fs.mkdirSync(binaryDir, { recursive: true });
}

// Move the compiled executable
console.log("Moving compiled binary to " + binaryDir);
fs.copyFileSync(
    "target/release/checker.exe",
    binaryDir + "/checker-x86_64-pc-windows-msvc.exe"
);

console.log("Done!");
