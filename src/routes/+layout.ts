// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
import { browser } from "$app/environment";
import "$lib/i18n"; // Import to initialize. Important :)
import { locale, waitLocale } from "svelte-i18n";
import type { LayoutLoad } from "./$types";

export const prerender = true;
export const ssr = false;

export const load: LayoutLoad = async () => {
    if (browser) {
        locale.set(window.navigator.language);
    }
    await waitLocale();
};
