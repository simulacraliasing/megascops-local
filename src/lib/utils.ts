import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
    dialogConfig,
    detectStatus,
    config,
    type Config,
    devices,
    models,
    type ModelConfig,
    type DownloadProgress,
} from "./store.svelte";
import {
    readDir,
    BaseDirectory,
    readTextFile,
    exists,
    remove,
} from "@tauri-apps/plugin-fs";
import { resourceDir, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { Command, open as openFile } from "@tauri-apps/plugin-shell";
import { unwrapFunctionStore, format } from "svelte-i18n";
import { listen } from "@tauri-apps/api/event";
import { Window } from "@tauri-apps/api/window";
import * as toml from "toml";

const $format = unwrapFunctionStore(format);

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const openSelectedFolder = () => {
    openFile(config.detectOptions.selectedFolder);
    closeDialog();
};

export const showDialog = (title: string, description: string) => {
    dialogConfig.isOpen = true;
    dialogConfig.title = title;
    dialogConfig.description = description;
};

export const closeDialog = () => {
    dialogConfig.isOpen = false;
    dialogConfig.title = "";
    dialogConfig.description = "";
};

interface SelectOptions {
    directory?: boolean;
    filters?: { name: string; extensions: string[] }[];
    title: string;
}

export async function selectPath({
    directory = false,
    filters,
    title,
}: SelectOptions) {
    try {
        const selected = await open({
            directory,
            multiple: false,
            filters,
            title,
        });

        if (selected) {
            return Array.isArray(selected) ? selected[0] : selected;
        }

        return undefined;
    } catch (err) {
        console.error(
            `Failed to select ${directory ? "folder" : "file"}:`,
            err
        );
        return undefined;
    }
}

export const selectFolder = async () =>
    (config.detectOptions.selectedFolder = await selectPath({
        directory: true,
        title: "Select Media Folder",
    }));

export const selectResumePath = async () =>
    (config.detectOptions.resumePath = await selectPath({
        filters: [{ name: "Result file", extensions: ["json", "csv"] }],
        title: "Select result file",
    }));

export const selectBufferFolder = async () =>
    (config.configOptions.bufferPath = await selectPath({
        directory: true,
        title: "Select Buffer Folder",
    }));

export async function saveConfig() {
    try {
        const store = await load("store.json", { autoSave: false });

        await store.set("config", config);

        console.log("Configuration stored successfully");
    } catch (err) {
        console.error("Failed to store configuration:", err);
    }
}

export async function loadConfig() {
    try {
        const store = await load("store.json", { autoSave: false });
        const config_stored = (await store.get("config")) as Config;
        if (config_stored) {
            config.configOptions = config_stored.configOptions;
            config.detectOptions = config_stored.detectOptions;
            config.firstRun = config_stored.firstRun;
        }
    } catch (err) {
        console.error("Failed to load configuration:", err);
    }
}

export async function startProcessing() {
    if (!config.detectOptions.selectedFolder) {
        alert("Please select a folder first");
        return;
    }

    config.detectOptions.resumePath =
        config.detectOptions.resumePath?.trim() || null;

    config.configOptions.bufferPath =
        config.configOptions.bufferPath?.trim() || null;

    await saveConfig();

    detectStatus.isProcessing = true;
    detectStatus.progress = 0;

    try {
        console.log("Starting processing with config:", config);

        await invoke("process_media", {
            config,
        });

        console.log("Processing complete");
    } catch (err) {
        console.error("Processing failed:", err);
        detectStatus.isProcessing = false;
    }
}

export async function organize() {
    let command;
    const resultFile = `${config.detectOptions.selectedFolder}/result${
        config.configOptions.exportFormat === "Json" ? ".json" : ".csv"
    }`;
    const logFile = `${config.detectOptions.selectedFolder}/organize.log`;
    if (config.detectOptions.guess) {
        command = Command.sidecar(
            "binaries/organize",
            [
                "--result",
                resultFile,
                "--mode",
                "guess",
                "--log-level",
                "INFO",
                "--log-file",
                logFile,
            ],
            { encoding: "utf8" }
        );
    } else {
        command = Command.sidecar(
            "binaries/organize",
            [
                "--result",
                resultFile,
                "--mode",
                "default",
                "--log-level",
                "INFO",
                "--log-file",
                logFile,
            ],
            { encoding: "utf8" }
        );
    }
    detectStatus.isOrganizing = true;
    const output = await command.execute();
    if (output.code !== 0) {
        detectStatus.isOrganizing = false;
        showDialog(
            $format("dialog.title.Error"),
            `${$format("dialog.message.organizeFailed")}${logFile}`
        );
    } else {
        detectStatus.isOrganizing = false;
        showDialog(
            $format("dialog.title.Organize"),
            `${$format("dialog.message.organizeComplete")}${logFile}`
        );
    }
}

export async function undo() {
    const resultFile = `${config.detectOptions.selectedFolder}/result${
        config.configOptions.exportFormat === "Json" ? ".json" : ".csv"
    }`;
    const logFile = `${config.detectOptions.selectedFolder}/organize.log`;
    const command = Command.sidecar(
        "binaries/organize",
        [
            "--result",
            resultFile,
            "--mode",
            "undo",
            "--log-level",
            "INFO",
            "--log-file",
            logFile,
        ],
        { encoding: "utf8" }
    );
    detectStatus.isUndoOrganizing = true;
    const output = await command.execute();
    if (output.code !== 0) {
        detectStatus.isUndoOrganizing = false;
        showDialog(
            $format("dialog.title.Error"),
            `${$format("dialog.message.undoFailed")}${logFile}`
        );
    } else {
        detectStatus.isUndoOrganizing = false;
        showDialog(
            $format("dialog.title.Undo"),
            `${$format("dialog.message.undoComplete")}${logFile}`
        );
    }
}

export async function toggleConfig() {
    detectStatus.showConfig = !detectStatus.showConfig;
    detectStatus.configIconAnimating = true;
    setTimeout(() => {
        detectStatus.configIconAnimating = false;
    }, 500);
}

export async function listDevices() {
    try {
        await invoke("list_devices");
        console.log("fetched devices", devices.value);
    } catch (err) {
        console.log("Failed to list devices:", err);
    }
}

export async function getModels() {
    const models_ = [];
    const entries = await readDir("models", {
        baseDir: BaseDirectory.Resource,
    });
    const resource = await resourceDir();
    for (const entry of entries) {
        if (entry.isFile && entry.name.endsWith(".toml")) {
            const config_path = await join(resource, "models", entry.name);
            const config = toml.parse(
                await readTextFile("models/" + entry.name, {
                    baseDir: BaseDirectory.Resource,
                })
            ) as {
                name: string;
                path: string;
                url: string;
                md5: string;
            };
            const model: ModelConfig = {
                name: config.name,
                config_file: config_path,
                url: config.url,
                onnx_file: await join(resource, config.path),
                isDownloaded: false,
                downloading: false,
                downloadProgress: 0,
                md5: config.md5,
            };

            try {
                const fileExists = await exists(config.path, {
                    baseDir: BaseDirectory.Resource,
                });

                if (fileExists && config.md5) {
                    // Validate MD5 checksum for existing files
                    try {
                        // Read the file as binary
                        const fullPath = await join(resource, config.path);

                        const calculatedMd5 = await invoke("calculate_md5", {
                            filePath: fullPath,
                        });

                        if (calculatedMd5 === config.md5.toLowerCase()) {
                            model.isDownloaded = true;
                            console.log(
                                `MD5 checksum verified for ${model.name}`
                            );
                        } else {
                            console.error(
                                `MD5 checksum mismatch for ${model.name}. Expected: ${config.md5}, Got: ${calculatedMd5}`
                            );
                            // Remove corrupted file
                            await remove(config.path, {
                                baseDir: BaseDirectory.Resource,
                            });
                            model.isDownloaded = false;
                        }
                    } catch (error) {
                        console.error(
                            `Error validating MD5 for ${model.name}:`,
                            error
                        );
                        model.isDownloaded = fileExists; // Fall back to file existence check
                    }
                } else {
                    model.isDownloaded = fileExists;
                }
            } catch (error) {
                console.error(
                    `Error checking if ${model.onnx_file} exists:`,
                    error
                );
                model.isDownloaded = false;
            }

            models_.push(model);
        }
    }
    models.value = models_;
}

export async function downloadModel(model: ModelConfig) {
    const appWindow = Window.getCurrent();
    // 检查必要条件
    if (!model.url) {
        console.error(
            `Cannot download model ${model.name}: URL is not defined`
        );
        return;
    }

    if (!model.onnx_file) {
        console.error(
            `Cannot download model ${model.name}: onnx_file is not defined`
        );
        return;
    }

    try {
        // 设置下载状态
        model.downloading = true;
        model.downloadProgress = 0;
        updateModels();

        // 设置进度监听器
        const unlisten = await listen<DownloadProgress>(
            "download-progress",
            (event) => {
                if (event.payload.modelName === model.name) {
                    console.log("Model download progress:", event.payload);
                    model.downloadProgress = event.payload.progress;

                    if (event.payload.finished) {
                        model.downloading = false;
                        model.isDownloaded = !event.payload.error;

                        if (event.payload.error) {
                            console.error(
                                `Model${model.name} download failed:`,
                                event.payload.error
                            );
                            appWindow.emit("show-notification", {
                                title: "Download Failed",
                                body: `Model ${model.name} download failed: ${event.payload.error}`,
                            });
                        } else {
                            appWindow.emit("show-notification", {
                                title: "下载完成",
                                body: `Model ${model.name} downloaded successfully`,
                            });
                        }

                        unlisten();
                    }

                    updateModels();
                }
            }
        );

        // 调用 Rust 后端下载文件
        await invoke("download_model", {
            url: model.url,
            destination: model.onnx_file,
            modelName: model.name,
            md5: model.md5,
        });
    } catch (error) {
        console.error(`Could not download model ${model.name}:`, error);
        model.downloading = false;
        model.downloadProgress = 0;
        updateModels();

        appWindow.emit("show-notification", {
            title: "Download Failed",
            body: `Could not download model ${model.name}: ${error}`,
        });
    }
}

function updateModels() {
    const currentModels = models.value;
    models.value = [...currentModels];
}
