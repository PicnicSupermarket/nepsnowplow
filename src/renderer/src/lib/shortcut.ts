// Render a keyboard chord as a platform-appropriate string. macOS gets
// glyphs (⌘⇧F), every other host gets the "+" form (Ctrl+Shift+F).
// "Mod" is the OS-specific primary modifier (Command on mac, Ctrl
// elsewhere) so callers don't have to branch.

const isMac = typeof window !== "undefined" && window.api?.platform === "darwin";

const GLYPHS: Record<string, string> = {
    Mod: "⌘",
    Shift: "⇧",
    Alt: "⌥",
    Ctrl: "⌃",
};

const PLAIN: Record<string, string> = {
    Mod: "Ctrl",
};

export function shortcut(...parts: string[]): string {
    if (isMac) {
        return parts.map((p) => GLYPHS[p] ?? p).join("");
    }
    return parts.map((p) => PLAIN[p] ?? p).join("+");
}
