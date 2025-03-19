<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card/index";
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import * as Select from "$lib/components/ui/select/index";
    import { Slider } from "$lib/components/ui/slider";
    import { Switch } from "$lib/components/ui/switch";
    import { Folder, Bolt } from "lucide-svelte";
    import { _ } from "svelte-i18n";
    import ConfigSlider from "$lib/components/ConfigSlider.svelte";
    import { toggleConfig, selectBufferFolder } from "$lib/utils";
    import { detectStatus, config } from "$lib/store.svelte";
    import TooltipWrapper from "$lib/components/TooltipWrapper.svelte";
</script>

<Card.Root class="h-full w-full m-0 rounded-none shadow-none">
    <Card.Header class="flex flex-row items-center justify-between">
        <Card.Title>{$_("title.config")}</Card.Title>
        <TooltipWrapper text={$_("tooltip.config")}>
            <Button
                variant="ghost"
                size="icon"
                onclick={toggleConfig}
                class="config-button"
            >
                <div
                    class={detectStatus.configIconAnimating
                        ? "spin-animation-close"
                        : ""}
                >
                    <Bolt style="width: 1.5rem; height: 1.5rem;" />
                </div>
            </Button>
        </TooltipWrapper>
    </Card.Header>
    <Card.Content>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 overflow-auto">
            <ConfigSlider
                id="confidence"
                label={$_("config.confidence")}
                min={0.1}
                max={1}
                step={0.05}
                bind:value={config.configOptions.confidenceThreshold}
            />

            <ConfigSlider
                id="iou"
                label={$_("config.iou")}
                min={0.1}
                max={1}
                step={0.05}
                bind:value={config.configOptions.iouThreshold}
            />

            <ConfigSlider
                id="quality"
                label={$_("config.quality")}
                min={10}
                max={100}
                step={5}
                bind:value={config.configOptions.quality}
            />
            <div id="max-frames" class="flex flex-col gap-3">
                <Label>{$_("config.maxFrames")}</Label>
                <div class="flex items-center gap-2">
                    <div class="flex-grow">
                        <Slider
                            type="single"
                            min={0}
                            max={15}
                            step={1}
                            bind:value={config.configOptions.maxFrames}
                        />
                    </div>
                    <span class="ml-1 min-w-1 text-right"
                        >{config.configOptions.maxFrames}</span
                    >
                    <div
                        id="iframe-only"
                        class="flex gap-2 w-auto items-center"
                    >
                        <Switch
                            bind:checked={config.configOptions.iframeOnly}
                        />
                        <Label for="iframe-only"
                            >{$_("config.iframeOnly")}</Label
                        >
                    </div>
                </div>
            </div>

            <div id="export-format" class="config-item">
                <Label for="export-format">{$_("config.exportFormat")}</Label>
                <Select.Root
                    type="single"
                    bind:value={config.configOptions.exportFormat}
                >
                    <Select.Trigger
                        >{config.configOptions.exportFormat}</Select.Trigger
                    >
                    <Select.Content>
                        <Select.Item value="Json" label="JSON" />
                        <Select.Item value="Csv" label="CSV" />
                    </Select.Content>
                </Select.Root>
            </div>

            <div id="buffer-path" class="config-item">
                <Label for="buffer-path">{$_("config.bufferPath")}</Label>
                <div class="flex items-center gap-2">
                    <div class="flex-grow">
                        <Input
                            type="text"
                            bind:value={config.configOptions.bufferPath}
                            placeholder={$_("detect.folderPlaceholder")}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onclick={selectBufferFolder}
                        disabled={detectStatus.isProcessing}
                    >
                        <Folder />
                    </Button>
                </div>
            </div>

            <ConfigSlider
                id="buffer-size"
                label={$_("config.bufferSize")}
                min={0}
                max={50}
                step={5}
                bind:value={config.configOptions.bufferSize}
            />

            <ConfigSlider
                id="check-point"
                label={$_("config.checkPoint")}
                min={0}
                max={1000}
                step={50}
                bind:value={config.configOptions.checkPoint}
            />
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
            transform: rotate(180deg);
        }
    }

    @keyframes spin-close {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(180deg);
        }
    }

    .spin-animation-close {
        animation: spin-close 0.5s ease-in-out;
    }
</style>
