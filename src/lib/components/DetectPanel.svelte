<script lang="ts">
    import { open } from "@tauri-apps/plugin-shell";
    import { Toggle } from "$lib/components/ui/toggle/index";
    import * as Card from "$lib/components/ui/card/index";
    import { Label } from "$lib/components/ui/label/index";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import * as Select from "$lib/components/ui/select/index";
    import TooltipWrapper from "$lib/components/TooltipWrapper.svelte";
    import { _ } from "svelte-i18n";
    import {
        Folder,
        Bolt,
        Play,
        LoaderCircle,
        Shapes,
        Undo2,
        FlaskConical,
        CircleHelp,
        Clock,
        Github,
        CircleMinus,
        CirclePlus,
        Check,
        Download,
    } from "lucide-svelte";
    import {
        selectFolder,
        selectResumePath,
        startProcessing,
        organize,
        undo,
        toggleConfig,
        showDialog,
        downloadModel,
    } from "$lib/utils";
    import {
        detectStatus,
        config,
        devices,
        type EpConfig,
        models,
        modelsLoading,
    } from "$lib/store.svelte";
    import { onDestroy } from "svelte";
    import { startTour } from "$lib/tour";

    let elapsedTime = $state("00:00:00");
    let remainingTime = $state("");
    let isModelSelectOpen = $state(false);
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    let startTime: number | null = null;
    let lastProgress = 0;

    function getSelectedModelName(configFile: string) {
        if (!configFile) return $_("detect.modelPlaceholder");
        const selectedModel = models.value.find(
            (model) => model.config_file === configFile,
        );
        return selectedModel ? selectedModel.name : configFile;
    }

    function getSelectedDevices() {
        return config.detectOptions.ep.map((epConfig) => epConfig.device);
    }

    function getAvailableDevices() {
        const selectedDevices = new Set(getSelectedDevices());
        return [...devices.value.keys()].filter(
            (deviceName) => !selectedDevices.has(deviceName),
        );
    }

    function addEpConfig() {
        const availableDevices = getAvailableDevices();
        if (availableDevices.length > 0) {
            const newDevice = availableDevices[0];
            // Get available EPs for the new device
            const availableEps = getEpOptions(newDevice);
            // Select the first available EP, or default to "Cpu" if none available
            const initialEp = availableEps.length > 0 ? availableEps[0] : "Cpu";

            const epId = getEpId(newDevice, initialEp);

            config.detectOptions.ep = [
                ...config.detectOptions.ep,
                { ep: initialEp, device: newDevice, workers: 1, id: epId },
            ];
        } else {
            showDialog(
                $_("dialog.title.Error"),
                $_("dialog.message.noAvailableDevice"),
            );
        }
    }

    function deleteEpConfig(index: number) {
        config.detectOptions.ep = config.detectOptions.ep.filter(
            (_, i) => i !== index,
        );
    }

    function getEpOptions(deviceName: string) {
        const device = devices.value.get(deviceName);
        return device ? device.ep.map((epInfo) => epInfo.ep) : [];
    }

    function getEpId(deviceName: string, ep: string) {
        const device = devices.value.get(deviceName);
        const epInfo = device?.ep.find((info) => info.ep === ep);
        return epInfo ? epInfo.id : "";
    }

    function handleDeviceChange(epConfig: EpConfig, newDevice: string) {
        epConfig.device = newDevice;

        const availableEps = getEpOptions(newDevice);

        // Reset the EP to the first available option for the new device
        if (availableEps.length > 0) {
            epConfig.ep = availableEps[0];
            epConfig.id = getEpId(epConfig.device, epConfig.ep);
        } else {
            // Fallback to "Cpu" if no options available (shouldn't happen in normal cases)
            epConfig.ep = "Cpu";
        }

        // Force update the config to ensure reactivity
        config.detectOptions.ep = [...config.detectOptions.ep];
    }

    function handleEpChange(epConfig: EpConfig, newEp: string) {
        epConfig.id = getEpId(epConfig.device, newEp);
        config.detectOptions.ep = [...config.detectOptions.ep];
    }

    // Format seconds into HH:MM:SS
    function formatTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return [hours, minutes, secs]
            .map((v) => v.toString().padStart(2, "0"))
            .join(":");
    }

    // Start timer when processing begins
    function startTimer() {
        if (timerInterval) return;

        startTime = Date.now();
        lastProgress = detectStatus.progress;

        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime!) / 1000);
            elapsedTime = formatTime(elapsed);

            // 计算剩余时间
            const currentProgress = detectStatus.progress;
            if (currentProgress > 0 && currentProgress > lastProgress) {
                // 计算处理速度 (进度百分比/秒)
                const progressRate = currentProgress / elapsed;
                if (progressRate > 0) {
                    // 计算剩余秒数
                    const remainingSeconds = Math.max(
                        0,
                        Math.floor((100 - currentProgress) / progressRate),
                    );
                    remainingTime = formatTime(remainingSeconds);
                }
            }
            lastProgress = currentProgress;
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            remainingTime = "";
        }
    }

    async function handleStartProcessing() {
        startTimer();
        await startProcessing();
    }

    // Clean up on component destroy
    onDestroy(() => {
        stopTimer();
    });

    // Watch for changes in processing status
    $effect(() => {
        if (!detectStatus.isProcessing && timerInterval) {
            stopTimer();
        }
    });

    $effect(() => {
        if (!Array.isArray(config.detectOptions.ep)) {
            console.warn(
                "ep is not an array, resetting to default",
                config.detectOptions.ep,
            );
            config.detectOptions.ep = [
                { ep: "Cpu", device: "CPU", workers: 1, id: "cpu" },
            ];
        }
    });

    function openGithub() {
        open("https://github.com/simulacraliasing/Megascops-local");
    }
</script>

<Card.Root class="h-full w-full m-0 rounded-none shadow-none">
    <Card.Header class="flex justify-between items-center flex-row">
        <Card.Title>{$_("title.detect")}</Card.Title>
        <div>
            <TooltipWrapper text={$_("tooltip.github")}>
                <Button
                    id="github"
                    variant="ghost"
                    size="icon"
                    onclick={openGithub}
                >
                    <Github style="width: 1.5rem; height: 1.5rem;" /></Button
                >
            </TooltipWrapper>
            <TooltipWrapper text={$_("tooltip.help")}>
                <Button
                    id="help"
                    variant="ghost"
                    size="icon"
                    onclick={startTour}
                    disabled={detectStatus.isProcessing}
                >
                    <CircleHelp style="width: 1.5rem; height: 1.5rem;" />
                </Button>
            </TooltipWrapper>
            <TooltipWrapper text={$_("tooltip.config")}>
                <Button
                    id="config-button"
                    variant="ghost"
                    size="icon"
                    onclick={toggleConfig}
                    disabled={detectStatus.isProcessing}
                    class="config-button"
                >
                    <div
                        class={detectStatus.configIconAnimating
                            ? "spin-animation-open"
                            : ""}
                    >
                        <Bolt style="width: 1.5rem; height: 1.5rem;" />
                    </div>
                </Button>
            </TooltipWrapper>
        </div>
    </Card.Header>
    <Card.Content class="flex flex-col gap-6">
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div id="media-folder" class="flex flex-col gap-2 col-span-full">
                <Label for="folder">{$_("detect.folder")}</Label>
                <div class="flex gap-2">
                    <Input
                        type="text"
                        id="folder"
                        bind:value={config.detectOptions.selectedFolder}
                        placeholder={$_("detect.folderPlaceholder")}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onclick={selectFolder}
                        disabled={detectStatus.isProcessing}
                    >
                        <Folder />
                    </Button>
                </div>
            </div>
            <div id="model" class="flex flex-col gap-2">
                <Label>{$_("detect.model")}</Label>
                <div class="flex gap-2">
                    <Select.Root
                        type="single"
                        bind:value={config.detectOptions.model}
                        bind:open={isModelSelectOpen}
                    >
                        <Select.Trigger>
                            {#if modelsLoading.value}
                                <span class="text-gray-400"
                                    >{$_("loading")}</span
                                >
                            {:else}
                                {getSelectedModelName(
                                    config.detectOptions.model,
                                )}
                            {/if}
                        </Select.Trigger>
                        <Select.Content>
                            {#if modelsLoading.value}
                                <div
                                    class="flex items-center justify-center p-4"
                                >
                                    <LoaderCircle
                                        class="w-5 h-5 mr-2 animate-spin"
                                    />
                                </div>
                            {:else}
                                {#each models.value as model}
                                    <div class="relative">
                                        <Select.Item
                                            value={model.config_file}
                                            label={model.name}
                                            class="flex justify-between items-center"
                                        >
                                            <span>{model.name}</span>

                                            {#if !model.isDownloaded}
                                                <!-- 下载按钮 -->
                                                <button
                                                    onclick={(e) => {
                                                        downloadModel(model);
                                                        setTimeout(() => {
                                                            isModelSelectOpen = true;
                                                        }, 0);
                                                        return false;
                                                    }}
                                                >
                                                    {#if model.downloading}
                                                        <LoaderCircle
                                                            class="w-4 h-4 animate-spin"
                                                        />
                                                    {:else}
                                                        <Download
                                                            class="w-4 h-4"
                                                        />
                                                    {/if}
                                                </button>
                                            {:else}
                                                <Check class="w-4 h-4" />
                                            {/if}
                                        </Select.Item>

                                        <!-- 下载进度条 -->
                                        {#if model.downloading}
                                            <div
                                                class="absolute bottom-0 left-0 h-1 bg-slate-500 transition-all duration-300"
                                                style="width: {model.downloadProgress}%"
                                            ></div>
                                        {/if}
                                    </div>
                                {/each}
                            {/if}
                        </Select.Content>
                    </Select.Root>
                </div>
            </div>
            <div id="resume-path" class="flex flex-col gap-2">
                <Label>{$_("detect.resumePath")}</Label>
                <div class="flex gap-2">
                    <Input
                        type="text"
                        bind:value={config.detectOptions.resumePath}
                        placeholder={$_("detect.resumePathPlaceholder")}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onclick={selectResumePath}
                        disabled={detectStatus.isProcessing}
                    >
                        <Folder />
                    </Button>
                </div>
            </div>
        </section>
        <div id="ep-config" class="flex flex-col gap-8">
            <div class="grid grid-cols-4 gap-2 sm:grid-cols-4">
                <Label class="col-span-2">{$_("detect.selectDevice")}</Label>
                <Label>{$_("detect.selectEp")}</Label>
                <Label>{$_("detect.worker")}</Label>
            </div>
            {#each config.detectOptions.ep as epConfig, index}
                <div class="grid grid-cols-4 gap-2 sm:grid-cols-4 -mt-4">
                    <div
                        id="select-device-{index}"
                        class="flex flex-col gap-2 col-span-2"
                    >
                        <Select.Root
                            type="single"
                            bind:value={epConfig.device}
                            onValueChange={(value) =>
                                handleDeviceChange(epConfig, value)}
                        >
                            <Select.Trigger>{epConfig.device}</Select.Trigger>
                            <Select.Content>
                                {#each getAvailableDevices() as deviceName}
                                    <Select.Item
                                        value={deviceName}
                                        label={devices.value.get(deviceName)
                                            ?.name}
                                    />
                                {/each}
                                <!-- Include the current device to avoid it disappearing from the list -->
                                {#if !getAvailableDevices().includes(epConfig.device)}
                                    <Select.Item
                                        value={epConfig.device}
                                        label={devices.value.get(
                                            epConfig.device,
                                        )?.name || epConfig.device}
                                    />
                                {/if}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div id="select-ep-{index}">
                        <Select.Root
                            type="single"
                            bind:value={epConfig.ep}
                            onValueChange={(value) =>
                                handleEpChange(epConfig, value)}
                        >
                            <Select.Trigger>{epConfig.ep}</Select.Trigger>
                            <Select.Content>
                                {#each getEpOptions(epConfig.device) as epOption}
                                    <Select.Item
                                        value={epOption}
                                        label={epOption}
                                    />
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div id="worker-{index}" class="flex gap-2">
                        <Input
                            type="number"
                            min="1"
                            bind:value={epConfig.workers}
                        />
                        {#if index > 0}
                            <Button
                                variant="ghost"
                                size="icon"
                                class="w-4 p-4"
                                onclick={() => deleteEpConfig(index)}
                            >
                                <CircleMinus />
                            </Button>
                        {:else}
                            <div class="w-4 p-4"></div>
                        {/if}
                    </div>
                </div>
            {/each}
            <Button
                id="add-ep"
                class="m-0 p-1 h-6 -mt-4"
                variant="ghost"
                onclick={addEpConfig}><CirclePlus /></Button
            >
        </div>
        <!-- progress -->
        <div id="progress" class="mb-0 relative -mt-2">
            <!-- 进度条 -->
            <div class="h-5 bg-muted rounded-full overflow-hidden">
                <div
                    class="h-5 bg-primary flex items-center justify-center transition-all duration-300 ease-out"
                    style="width: {detectStatus.progress}%"
                >
                    <span class="text-xs font-medium text-primary-foreground">
                        {Math.round(detectStatus.progress)}%
                    </span>
                </div>
            </div>

            <!-- 时间信息 -->
            <div
                class="flex justify-between mt-2 text-xs text-muted-foreground"
            >
                <div class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    <span>{elapsedTime}</span>
                </div>

                {#if remainingTime !== ""}
                    <div>
                        {$_("detect.remainTime")}
                        {remainingTime}
                    </div>
                {/if}
            </div>
        </div>
        <!-- control buttons -->
        <div class="flex items-center relative -mt-2">
            <TooltipWrapper text={$_("tooltip.guess")}>
                <Toggle
                    id="guess"
                    size="sm"
                    aria-label="Toggle guess"
                    bind:pressed={config.detectOptions.guess}
                >
                    <FlaskConical class="h-4 w-4" />
                </Toggle>
            </TooltipWrapper>

            <div
                class="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2"
            >
                <div class="flex items-center">
                    <TooltipWrapper text={$_("tooltip.organize")}>
                        <Button
                            id="organize"
                            variant="ghost"
                            size="icon"
                            onclick={organize}
                            disabled={detectStatus.isProcessing ||
                                !config.detectOptions.selectedFolder}
                        >
                            {#if detectStatus.isOrganizing}
                                <LoaderCircle
                                    class="animate-spin"
                                    style="width: 1.2rem; height: 1.2rem;"
                                />
                            {:else}
                                <Shapes
                                    style="width: 1.2rem; height: 1.2rem;"
                                />
                            {/if}
                        </Button>
                    </TooltipWrapper>

                    <TooltipWrapper text={$_("tooltip.start")}>
                        <Button
                            id="start"
                            variant="ghost"
                            size="icon"
                            onclick={handleStartProcessing}
                            disabled={detectStatus.isProcessing ||
                                !config.detectOptions.selectedFolder ||
                                !models.value.some(
                                    (model) =>
                                        model.config_file ===
                                            config.detectOptions.model &&
                                        model.isDownloaded === true,
                                )}
                        >
                            {#if detectStatus.isProcessing}
                                <LoaderCircle
                                    class="animate-spin"
                                    style="width: 1.5rem; height: 1.5rem;"
                                />
                            {:else}
                                <Play style="width: 1.5rem; height: 1.5rem;" />
                            {/if}
                        </Button>
                    </TooltipWrapper>

                    <TooltipWrapper text={$_("tooltip.undo")}>
                        <Button
                            id="undo"
                            variant="ghost"
                            size="icon"
                            onclick={undo}
                            disabled={detectStatus.isProcessing ||
                                !config.detectOptions.selectedFolder}
                        >
                            {#if detectStatus.isUndoOrganizing}
                                <LoaderCircle
                                    class="animate-spin"
                                    style="width: 1.2rem; height: 1.2rem;"
                                />
                            {:else}
                                <Undo2 style="width: 1.2rem; height: 1.2rem;" />
                            {/if}
                        </Button>
                    </TooltipWrapper>
                </div>
            </div>
        </div>
    </Card.Content>
</Card.Root>

<style>
    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes spin-open {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(-180deg);
        }
    }

    .spin-animation-open {
        animation: spin-open 0.5s ease-in-out;
    }
</style>
