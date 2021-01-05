import { requiredOption } from "commander";
import { publish } from "./publisher";

const options = requiredOption("-a, --addon [name]", "Add-on name")
    .requiredOption("-p, --path [path]", "Add-on directory path")
    .requiredOption("-t, --tag [tag]", "The version tag like refs/tags/9.8.0")
    .option("--cursekey [key]")
    .option("--curseid [id]")
    .option("--wowikey [key]")
    .option("--wowiid [id]")
    .option("--changelog [changelog]", "Changelog in Markdown format")
    .option("--dryrun")
    .parse(process.argv)
    .opts();

publish(
    options.addon,
    options.path,
    options.tag,
    options.cursekey,
    parseInt(options.curseid),
    options.wowikey,
    parseInt(options.wowiid),
    options.changelog,
    options.dryrun
);
