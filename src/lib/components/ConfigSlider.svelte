<script lang="ts">
    import { Label } from "$lib/components/ui/label/index";
    import { Slider } from "$lib/components/ui/slider/index";

    export let id: string;
    export let label: string;
    export let min = 0;
    export let max = 100;
    export let step = 1;
    export let value: number;
    export let unit = "";
</script>

<div {id} class="flex flex-col gap-3">
    <Label>{label}</Label>
    <div class="flex items-center gap-2">
        <div class="flex-grow">
            <Slider type="single" {min} {max} {step} bind:value />
        </div>
        <span class="ml-1 min-w-1 text-right">{value}{unit}</span>
    </div>
</div>
