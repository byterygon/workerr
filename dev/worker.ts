import { Workerr } from "../lib/workerrThread";
import { commands } from "./commands";

async function main() {
    const workerr = await Workerr.create({
        asyncRequest: commands
    })

    workerr.addListener("context:update", (c) => {
        console.log(c)
    })
}
main()