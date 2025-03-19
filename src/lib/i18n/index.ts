import { browser } from "$app/environment";
import { init, register } from "svelte-i18n";

const defaultLocale = "en";

register("en", () => import("../../i18n/en.json"));
register("zh-CN", () => import("../../i18n/zh-CN.json"));

init({
    fallbackLocale: defaultLocale,
    initialLocale: browser ? window.navigator.language : defaultLocale,
});
