import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [dts({ include: ["lib"], })],
    build: {
        lib: {
            entry: resolve(__dirname, "lib/index.ts"),
            formats: ["es", "umd", "cjs"], name: "@byterygon/workerr"
        },
        copyPublicDir: false,
    },
});
