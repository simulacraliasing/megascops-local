# Megascops (A GUI client to detect camera trap media)

EN | [中文](README_CN.md)

Megascops is a GUI implementation of the [md5rs-client](https://github.com/simulacraliasing/md5rs-client), which should be used paired with the [md5rs-server](https://github.com/simulacraliasing/md5rs-server). Everyone can host a server and share to others. There is a public server hosted by [Shanshui Conservation Center](http://www.shanshui.org/), which is also the default server. You can obtain an access token(with a daily quota limit) after registration on [红外相机照片AI识别助手](https://cameratraps.hinature.cn).

Megascops is based on:
- [Tauri 2.0](https://tauri.app/)
- [Svelte 5](https://svelte.dev/)
- [Rust](https://www.rust-lang.org/)
- [gRPC](https://grpc.io/)

The server side model detection is based on:
- [Megadetector](https://github.com/microsoft/CameraTraps/tree/main): a series of Microsoft's models for camera trap detection.
- [pykeio/ort](https://github.com/pykeio/ort): a Rust wrapper for ONNX Runtime.

## Getting Started
You can download installer of your platform from [release](https://github.com/simulacraliasing/Megascops/releases).

App screenshot:
![](https://github.com/simulacraliasing/Megascops/blob/main/static/Screenshot.png)

You can click question mark button to start a tour to know how to use the app.

Media files (extensions: .jpg .jpeg .png .mp4 .avi .mkv .mov) are processed recursively. The result file is saved in the same directory as the media folder, named `result.json/.csv`. New result will overwrite the old one. Organize will create new folders of classes in each subfolder of the media folder and move corresponding media to folders.

## Supported Platforms
Prebuilt binaries are available for the following platforms:
- Windows(Only x86_64): Windows 7 and later
- MacOS(Both Apple Silicon and Intel): macOS Catalina (10.15) and later
- Linux(Both x86_64 and aarch64): see [link](https://v2.tauri.app/start/prerequisites/#linux) for specific distributions

You can try to build it yourself for other platforms if tauri and ffmpeg support them.

## Features
Megascops (and also md5rs-client&md5rs) is designed to perform detection on large volume of camera trap media, typically deployments in a quarter.

- [x] **Video process**: video process is supported, and optimized to be fast and efficient.
- [x] **Low-end Ok**: the client only en/decodes media and sends/receives data to/from the server, so it can be run on a low-end machine.
- [x] **Organize**: the client can organize media on their detected classes in each shot sequence (based on shot time or file name). 

What Megascops does not do:
- [ ] **Rendering detection results**: if you wanna review the detection results on the media, you have to implement your own rendering. But the detection results are losslessly saved, so you can use it to render the results.
- [ ] **Run without network**: as the detection is done on the server, the client needs to be connected to the server to perform detection. You can check [md5rs](https://https://github.com/simulacraliasing/md5rs) for local detection. And a GUI for it is on the way.

## Build

### Prerequisites

[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), 
[Svelte kit](https://svelte.dev/docs/kit/introduction),
[Protocol Buffer Compiler](https://grpc.io/docs/protoc-installation/),
[FFmpeg](https://ffmpeg.org/download.html)

Python and [nuitka](https://nuitka.net/user-documentation/user-manual.html) if you wanna compile [organize](https://github.com/simulacraliasing/organize/blob/main/main.py) yourself.

### Build commands

```sh
pnpm install
pnpm tauri build
```

### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).