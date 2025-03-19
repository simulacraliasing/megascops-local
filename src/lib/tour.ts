import { toggleConfig } from "./utils";
import Shepherd from "shepherd.js";
import "../shepherd.css";
import { offset } from "@floating-ui/dom";
import { unwrapFunctionStore, format } from "svelte-i18n";

const $format = unwrapFunctionStore(format);

interface SimpleTourStepConfig {
    id: string;
    position?: "top" | "right" | "bottom" | "left";
}

interface TourButton {
    text: string;
    action: () => void;
}

interface TourAttachment {
    element: string;
    on: "auto" | "top" | "right" | "bottom" | "left";
}

interface TourStep {
    id: string;
    text: string;
    buttons: TourButton[];
    attachTo: TourAttachment;
}

function toCamel(str: string): string {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function generateTourSteps(stepsConfig: SimpleTourStepConfig[]): TourStep[] {
    return stepsConfig.map((config) => {
        const camelCaseId = toCamel(config.id);
        const next_action = async () => {
            if (config.id === "config-button") {
                await toggleConfig();
                tour.next();
            } else {
                tour.next();
            }
        };

        const back_action = async () => {
            if (config.id === "confidence") {
                await toggleConfig();
                tour.back();
            } else {
                tour.back();
            }
        };

        return {
            id: `tour-${config.id}`,
            text: $format(`tour.${camelCaseId}`),
            buttons: [
                {
                    text: $format("tour.button.cancel"),
                    action: tour.cancel,
                },
                {
                    text: $format("tour.button.back"),
                    action: back_action,
                },
                {
                    text: $format("tour.button.next"),
                    action: next_action,
                    classes: "shepherd-button-primary",
                },
            ],
            attachTo: {
                element: `#${config.id}`,
                on: config.position || "bottom",
            },
            modalOverlayOpeningPadding: 6,
            floatingUIOptions: {
                middleware: [offset({ mainAxis: 18, crossAxis: -18 })],
            },
        };
    });
}

const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
        classes: "shepherd-shadcn-theme",
        scrollTo: false,
    },
});

tour.addStep({
    id: "help",
    text: $format("tour.help"),
    buttons: [
        {
            text: $format("tour.button.cancel"),
            action: tour.cancel,
        },
        {
            text: $format("tour.button.next"),
            action: tour.next,
            classes: "shepherd-button-primary",
        },
    ],
    attachTo: {
        element: "#help",
        on: "bottom",
    },
    floatingUIOptions: {
        middleware: [offset({ mainAxis: 18, crossAxis: -18 })],
    },
});

const tourSteps = generateTourSteps([
    { id: "media-folder" },
    { id: "resume-path", position: "top" },
    { id: "progress", position: "top" },
    { id: "guess", position: "top" },
    { id: "organize", position: "top" },
    { id: "start", position: "top" },
    { id: "undo", position: "top" },
    { id: "config-button", position: "bottom" },
    { id: "confidence" },
    { id: "iou" },
    { id: "quality" },
    { id: "max-frames" },
    { id: "iframe-only" },
    { id: "export-format", position: "top" },
    { id: "buffer-path", position: "top" },
    { id: "buffer-size", position: "top" },
]);

tour.addSteps(tourSteps);

tour.addStep({
    id: "check-point",
    text: $format("tour.checkPoint"),
    buttons: [
        {
            text: $format("tour.button.back"),
            action: tour.back,
        },
        {
            text: $format("tour.button.done"),
            action: tour.next,
            classes: "shepherd-button-primary",
        },
    ],
    attachTo: {
        element: "#check-point",
        on: "top",
    },
    modalOverlayOpeningPadding: 6,
    floatingUIOptions: {
        middleware: [offset({ mainAxis: 18, crossAxis: -18 })],
    },
});

export function startTour() {
    tour.start();
}
