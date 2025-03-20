# Megascops-local (A GUI to detect camera trap media on your own devices)

EN | [中文](README_CN.md)

Megascops-local is a GUI implementation of the [md5rs](https://github.com/simulacraliasing/md5rs).

Megascops is based on:
- [Tauri 2.0](https://tauri.app/)
- [Svelte 5](https://svelte.dev/)
- [Rust](https://www.rust-lang.org/)
- [pykeio/ort](https://github.com/pykeio/ort): a Rust wrapper for ONNX Runtime.
- [Megadetector](https://github.com/microsoft/CameraTraps/tree/main): a series of Microsoft's models for camera trap detection.

## Getting Started
You can download installer of your platform from [release](https://github.com/simulacraliasing/megascops-local/releases).

App screenshot:
![](https://github.com/simulacraliasing/Megascops-local/blob/main/static/Screenshot.png)

You can click question mark button to start a tour to know how to use the app.

Media files (extensions: .jpg .jpeg .png .mp4 .avi .mkv .mov) are processed recursively. The result file is saved in the same directory as the media folder, named `result.json/.csv`. New result will overwrite the old one. Organize will create new folders of classes in each subfolder of the media folder and move corresponding media to folders.

## Supported Platforms
Prebuilt binaries are available for the following platforms:
- Windows(Only x86_64): Windows 10 and later
- MacOS(Both Apple Silicon and Intel): macOS Catalina (10.15) and later
- Linux(Only x86_64): see [link](https://v2.tauri.app/start/prerequisites/#linux) for specific distributions

You can try to build it yourself for other platforms if tauri and ffmpeg support them.

## Features
Megascops (and also md5rs-client&md5rs) is designed to perform detection on large volume of camera trap media, typically deployments in a quarter.

- [x] **Offline**: all processes are done on your own devices.
- [x] **Video process**: video process is supported, and optimized to be fast and efficient.
- [x] **Multi devices**: devices including CPU, NVIDIA GPU, AMD GPU, Intel GPU and Apple Sillicon NPU are supported.
- [x] **Organize**: the client can organize media on their detected classes in each shot sequence (based on shot time or file name). 

What Megascops does not do:
- [ ] **Rendering detection results**: if you wanna review the detection results on the media, you have to implement your own rendering. But the detection results are losslessly saved, so you can use it to render the results.

## Build

### Prerequisites

[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), 
[Svelte kit](https://svelte.dev/docs/kit/introduction),
[Onnx Runtime](https://github.com/microsoft/onnxruntime)**,
[FFmpeg](https://ffmpeg.org/download.html)

Python and [nuitka](https://nuitka.net/user-documentation/user-manual.html) if you wanna compile [organize](https://github.com/simulacraliasing/organize/blob/main/main.py) yourself.

**For openvino ep support, you need to build onnxruntime with openvino by yourself, check[Build with different EPs](ttps://onnxruntime.ai/docs/build/eps.html#openvino)

### Build commands

```sh
pnpm install
pnpm tauri build
```

### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).
