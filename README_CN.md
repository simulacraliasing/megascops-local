# Megascops (一个用于检测红外相机媒体的GUI客户端)

[EN](README.md) | 中文

Megascops是[md5rs-client](https://github.com/simulacraliasing/md5rs-client)的GUI实现，应该与[md5rs-server](https://github.com/simulacraliasing/md5rs-server)配对使用。任何人都可以搭建服务器并与他人分享。目前有一个由[山水自然保护中心](http://www.shanshui.org/)托管的公共服务器，这也是默认的服务设置。您可以在[红外相机照片AI识别助手](https://cameratraps.hinature.cn)注册后获取访问令牌(有每日配额限制)。

Megascops基于以下技术:
- [Tauri 2.0](https://tauri.app/)
- [Svelte 5](https://svelte.dev/)
- [Rust](https://www.rust-lang.org/)
- [gRPC](https://grpc.io/)

服务器端模型检测基于:
- [Megadetector](https://github.com/microsoft/CameraTraps/tree/main): 微软开发的一系列用于红外相机检测的模型。
- [pykeio/ort](https://github.com/pykeio/ort): ONNX Runtime的Rust封装。

## 开始使用
您可以从[发布页面](https://github.com/simulacraliasing/Megascops/releases)下载适用于您平台的安装程序。

应用截图：
![](https://github.com/simulacraliasing/Megascops/blob/main/static/Screenshot.png)

您可以点击问号按钮开始引导，了解如何使用该应用。

媒体文件夹及其所有子文件夹中的视频和照片(支持的扩展名: .jpg .jpeg .png .mp4 .avi .mkv .mov)将被处理。结果文件保存在与媒体文件夹相同的目录中，命名为`result.json/.csv`。新的结果将覆盖旧的结果。组织功能将在媒体文件夹的每个子文件夹中创建新的分类文件夹。

## 支持的平台
预构建的二进制文件适用于以下平台：
- Windows（仅限x86_64）：Windows 7及更高版本
- MacOS（同时支持Apple Silicon和Intel）：macOS Catalina（10.15）及更高版本
- Linux（同时支持x86_64和aarch64）：有关特定发行版，请参阅[链接](https://v2.tauri.app/start/prerequisites/#linux)

如果Tauri和FFmpeg支持其他平台，您可以尝试自行为这些平台构建。

## 功能
Megascops (以及md5rs-client和md5rs)设计用于对大量红外相机媒体进行检测，通常是一个季度的部署数据。

- [x] **视频处理**: 支持视频处理，并为快速高效优化。
- [x] **低配置友好**: 客户端仅对媒体进行编解码并向服务器发送/接收数据，因此可以在低配置机器上运行。
- [x] **分包**: 客户端可以根据每个拍摄序列中检测到的类别组织媒体(基于拍摄时间或文件名)。

Megascops不能:
- [ ] **渲染检测结果**: 如果您想查看媒体上的检测结果，您需要自己实现渲染。但检测结果是完整保存的，所以您可以用它来渲染结果。
- [ ] **离线运行**: 由于检测在服务器上完成，客户端需要连接到服务器才能执行检测。您可以使用[md5rs](https://github.com/simulacraliasing/md5rs)进行本地检测。相应的GUI也在开发中。

## 构建

### 前置条件

[Tauri前置条件](https://v2.tauri.app/start/prerequisites/), 
[Svelte kit](https://svelte.dev/docs/kit/introduction),
[Protocol Buffer编译器](https://grpc.io/docs/protoc-installation/),
[FFmpeg](https://ffmpeg.org/download.html)

如果您想自己编译[organize](https://github.com/simulacraliasing/organize/blob/main/main.py)，还需要Python和[nuitka](https://nuitka.net/user-documentation/user-manual.html)。

### 构建命令

```sh
pnpm install
pnpm tauri build
```

### 推荐的IDE设置

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)。