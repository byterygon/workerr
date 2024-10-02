import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [dts({ include: ["lib"] })],
    build: {
        lib: {
            entry: {
                main: resolve(__dirname, "lib/mainThread/index.ts"),
                worker: resolve(__dirname, "lib/workerThread/index.ts"),
            },
            formats: ["es"],
        },
        copyPublicDir: false,
    },
});
