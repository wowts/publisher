import * as core from "@actions/core";
import { publish } from "./publisher";

async function run(): Promise<void> {
    try {
        const name = core.getInput("name");
        const path = core.getInput("path");
        const tag = core.getInput("tag");
        const cfApiKey = core.getInput("cf-api-key");
        const cfId = parseInt(core.getInput("cf-id"));
        const wowiApiToken = core.getInput("wowi-api-token");
        const wowiId = parseInt(core.getInput("wowi-id"));
        const changelog = core.getInput("changelog");

        // core.debug(`Waiting ${ms} milliseconds ...`); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true

        //core.debug(new Date().toTimeString());
        await publish(
            name,
            path,
            tag,
            cfApiKey,
            cfId,
            wowiApiToken,
            wowiId,
            changelog,
            false
        );
        //core.debug(new Date().toTimeString());

        core.setOutput("time", new Date().toTimeString());
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
