export const dialogConfig = $state({
    isOpen: false,
    title: "",
    description: "",
});

export interface EpInfo {
    ep: Ep;
    id: string;
}

export interface Device {
    deviceType: "Cpu" | "Gpu" | "Npu";
    name: string;
    ep: EpInfo[];
}

export const devices = $state({
    value: new Map<string, Device>(),
});

export const detectStatus = $state({
    progress: 0,
    isProcessing: false,
    showConfig: false,
    configIconAnimating: false,
    showPassword: false,
    isOrganizing: false,
    isUndoOrganizing: false,
});

export type Ep =
    | "CoreML"
    | "TensorRT"
    | "CUDA"
    | "OpenVINO"
    | "DirectML"
    | "Cpu";

export interface EpConfig {
    ep: Ep;
    workers: number;
    device: string;
}

export interface DetectOptions {
    selectedFolder: string;
    model: string;
    ep: EpConfig[];
    resumePath: string | null;
    guess: boolean;
}

interface ConfigOptions {
    confidenceThreshold: number;
    iouThreshold: number;
    quality: number;
    exportFormat: "Json" | "Csv"; // 可以使用联合类型限制可选值
    bufferPath: string | null;
    bufferSize: number;
    checkPoint: number;
    maxFrames: number;
    iframeOnly: boolean;
    batchSize: number;
}

// 定义主配置接口
export interface Config {
    detectOptions: DetectOptions;
    configOptions: ConfigOptions;
    firstRun: boolean;
}

export const config = $state<Config>({
    detectOptions: {
        selectedFolder: "",
        ep: [
            {
                ep: "Cpu",
                device: "CPU",
                workers: 1,
            },
        ],
        model: "",
        resumePath: null,
        guess: false,
    },
    configOptions: {
        confidenceThreshold: 0.2,
        iouThreshold: 0.45,
        quality: 70,
        exportFormat: "Json",
        bufferPath: null,
        bufferSize: 20,
        checkPoint: 100,
        maxFrames: 3,
        iframeOnly: true,
        batchSize: 2,
    },
    firstRun: true,
});
