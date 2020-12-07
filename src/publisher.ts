import AdmZip from "adm-zip";
import * as core from "@actions/core";
import bent from "bent";
import { readFileSync } from "fs";
import FormData from "form-data";
interface CurseGameVersion {
    id: number;
    gameVersionTypeID: number;
    name: string;
    slug: string;
}

interface WowInterfaceGameVersion {
    id: string;
    name: string;
    interface: string;
    default: boolean;
}

interface Toc {
    Interface?: string;
    Title?: string;
    Version?: string;
}

export async function publish(
    name: string,
    path: string,
    tag: string,
    cfApiKey: string,
    cfId: number,
    wowiApiToken: string,
    wowiId: number,
    changelog: string
): Promise<void> {
    const zip = new AdmZip();
    zip.addLocalFolder(path, name);
    const version = tag.startsWith("refs/tags/")
        ? tag.replace("refs/tags/", "")
        : tag.startsWith("refs/heads/")
        ? tag.replace("refs/heads/", "")
        : undefined;
    if (!version) {
        core.setFailed(`Unable to parse version from tag ${tag}`);
        return;
    }

    const zipName = `${name}-${version}.zip`;
    core.info(`Create zip ${zipName}`);

    const tocFile = readFileSync(`${path}/${name}.toc`, { encoding: "utf8" });
    const lines = tocFile.split(/\r?\n/);
    const toc: Toc = {};
    for (const line of lines) {
        const result = line.match(/^\s*##\s*(\w+):\s*(.*?)\s*$/);
        if (result) {
            toc[result[1] as keyof Toc] = result[2];
        }
    }

    if (version !== toc.Version) {
        core.setFailed(
            `Version in toc ${toc.Version} doesn't match tag ${version}`
        );
        return;
    }

    if (!toc.Interface) {
        core.setFailed("No Interface in toc");
        return;
    }

    let releaseType: string;
    if (version.includes("alpha")) releaseType = "alpha";
    else if (version.includes("beta")) releaseType = "beta";
    else releaseType = "release";

    const parsedVersion = parseInt(toc.Interface);
    const gameVersion = `${Math.floor(parsedVersion / 10000)}.${
        Math.floor(parsedVersion / 100) % 100
    }.${parsedVersion % 100}`;

    if (cfId) {
        let curseForgeClient = bent("json", "https://wow.curseforge.com");
        const versions: CurseGameVersion[] = await curseForgeClient(
            "/api/game/versions",
            "GET",
            {
                "x-api-token": cfApiKey,
            }
        );
        const curseGameVersion = versions.find(
            (x) => x.gameVersionTypeID === 517 && x.name === gameVersion
        );
        if (!curseGameVersion) {
            core.setFailed(
                `Game version ${gameVersion} not found on Curseforge`
            );
            return;
        }
        const formData = new FormData();
        formData.append("file", zip.toBuffer(), {
            filename: zipName,
            contentType: "application/zip",
        });
        formData.append(
            "metadata",
            JSON.stringify({
                changelog,
                changelogType: "markdown",
                displayName: toc.Version,
                gameVersions: [curseGameVersion.id],
                releaseType,
            })
        );
        curseForgeClient = bent("json", "POST", "https://wow.curseforge.com", [
            200,
            400,
        ]);
        const result = await curseForgeClient(
            `/api/projects/${cfId}/upload-file`,
            formData.getBuffer(),
            Object.assign(
                {
                    "x-api-token": cfApiKey,
                },
                formData.getHeaders()
            )
        );
        if (result && result.id) {
            core.info(`File ${result.id} uploaded to Curseforge`);
        } else if (result.errorMessage) {
            core.setFailed(result.errorMessage);
            return;
        } else {
            core.info(JSON.stringify(result));
            core.setFailed("Failed to upload to Curseforge");
            return;
        }
    }

    if (wowiId) {
        let client = bent("json", "https://api.wowinterface.com/");
        const versions: WowInterfaceGameVersion[] = await client(
            "/addons/compatible.json",
            "GET",
            {
                "x-api-token": wowiApiToken,
            }
        );
        const wowInterfaceGameVersion = versions.find(
            (x) => x.interface === toc.Interface
        );
        if (!wowInterfaceGameVersion) {
            core.setFailed(
                `Game version ${toc.Interface} not found on WowInterface`
            );
            return;
        }

        const formData = new FormData();
        formData.append("updatefile", zip.toBuffer(), {
            filename: zipName,
            contentType: "application/zip",
        });
        formData.append("id", wowiId);
        formData.append("version", toc.Version);
        formData.append("compatible", wowInterfaceGameVersion.id);

        client = bent("json", "POST", "https://api.wowinterface.com/", [
            200,
            202,
            400,
        ]);
        const result = await client(
            `/addons/update`,
            formData.getBuffer(),
            Object.assign(
                {
                    "x-api-token": wowiApiToken,
                },
                formData.getHeaders()
            )
        );

        if (result.errorMessage) {
            core.setFailed(result.errorMessage);
            return;
        } else {
            core.info(`File ${result.id} uploaded to WowInterface`);
            return;
        }
    }
}
