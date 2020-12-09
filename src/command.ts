import { requiredOption } from "commander";
import { publish } from "./publisher";

const options = requiredOption("-a, --addon [name]", "Add-on name")
    .requiredOption("-p, --path [path]", "Add-on directory path")
    .requiredOption("-t, --tag [tag]", "The version tag like ref/tags/9.8.0")
    .requiredOption("--cursekey [key]")
    .requiredOption("--curseid [id]")
    .requiredOption("--wowikey [key]")
    .requiredOption("--wowiid [id]")
    .option("--changelog [changelog]", "Changelog in Markdown format")
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
    options.changelog
);
