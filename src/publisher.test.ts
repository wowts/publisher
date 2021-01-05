import { CurseGameVersion, publish } from "./publisher";
jest.mock("bent");
import bent from "bent";
jest.mock("fs");
import * as fs from "fs";
jest.mock("archiver");
import archiver, { Archiver } from "archiver";
jest.mock("@actions/core");
import * as core from "@actions/core";
jest.mock("form-data");
import FormData from "form-data";
const formDataMock = FormData as jest.Mocked<typeof FormData>;
const formDataContent = new Map<string, any>();
formDataMock.prototype.append = (name, content) =>
    formDataContent.set(name, content);
formDataMock.prototype.getBuffer = () => Buffer.alloc(1);
type ArchiverType = typeof archiver;
const archiverMock = (archiver as unknown) as jest.MockInstance<
    ReturnType<ArchiverType>,
    Parameters<ArchiverType>
>;
const zipMock = ({} as unknown) as Archiver;
zipMock.directory = (dirpath, destpath) => zipMock;
zipMock.pipe = (t) => t;
zipMock.on = (event: string, listener: (...args: any[]) => void) => {
    listener();
    return zipMock;
};
archiverMock.mockImplementation(() => zipMock);
// archiverMock.prototype.directory = (localPath, name) => {};
// archiverMock.prototype.toBuffer = () => Buffer.alloc(1);

const fsMock = fs as jest.Mocked<typeof fs>;
fsMock.existsSync.mockImplementation(() => true);

const bentMock = bent as jest.Mocked<typeof bent>;
type BentReturn = ReturnType<typeof bent>;
const getCurseforge = jest
    .fn<ReturnType<BentReturn>, Parameters<BentReturn>>()
    .mockImplementation((...args: any[]) =>
        Promise.resolve<CurseGameVersion[]>([
            {
                id: 15,
                gameVersionTypeID: 517,
                name: "9.0.1",
                slug: "",
            },
        ])
    );

const postCurseforge = jest
    .fn<ReturnType<BentReturn>, Parameters<BentReturn>>()
    .mockImplementation((...args: any[]) => {
        return Promise.resolve({
            id: 155,
        });
    });

((bentMock as unknown) as jest.MockInstance<
    ReturnType<typeof bent>,
    Parameters<typeof bent>
>).mockImplementation((...args: any[]) => {
    if (args[0] === "json" && args[1] === "https://wow.curseforge.com")
        return getCurseforge;
    if (
        args[0] === "json" &&
        args[1] === "POST" &&
        args[2] === "https://wow.curseforge.com"
    )
        return postCurseforge;
    return getCurseforge;
});

let errorMessage: string | Error = "";
const coreMock = core as jest.Mocked<typeof core>;
coreMock.setFailed.mockImplementation((message) => (errorMessage = message));

test("that if it's an invalid tag, it returns false", async () => {
    const result = await publish(
        "ovale",
        ".",
        "v9.8.3",
        "azerty",
        18,
        "zerty",
        19,
        ""
    );
    expect(result).toBeFalsy();
    expect(errorMessage).toBe("Unable to parse version from tag v9.8.3");
});

test("that if the version doesn't match, it returns false", async () => {
    fsMock.readFileSync.mockImplementation(
        (path, options) => `## Version: 9.8.6`
    );
    const result = await publish(
        "ovale",
        ".",
        "refs/tags/v9.8.3",
        "azerty",
        18,
        "zerty",
        19,
        ""
    );
    expect(result).toBeFalsy();
    expect(errorMessage).toBe("Version in toc 9.8.6 doesn't match tag 9.8.3");
});

test("The version is not found in Curse", async () => {
    fsMock.readFileSync.mockImplementation(
        (path, options) => `## Version: 9.8.3
## Interface: 90002`
    );
    const result = await publish(
        "ovale",
        ".",
        "refs/tags/v9.8.3",
        "azerty",
        18,
        "zerty",
        19,
        ""
    );
    expect(result).toBeFalsy();
    expect(errorMessage).toBe("Game version 9.0.2 not found on Curseforge");
});

test("The version is uploaded to Curse with a changelog", async () => {
    fsMock.readFileSync.mockImplementation((path, options) => {
        if (path === "./ovale.toc")
            return `## Version: 9.8.3
            ## Interface: 90001`;
        return `# Changelog

Some text

### 9.8.3 (2020-12-07)

### Bug fixes

Some bugs

### Features

Some feature

### [9.8.2](http://) (2020-11-05)

### Bug fixes`;
    });
    const result = await publish(
        "ovale",
        ".",
        "refs/tags/9.8.3",
        "azerty",
        18,
        undefined,
        undefined,
        undefined
    );
    expect(result).toBeTruthy();
    const metadataContent = formDataContent.get("metadata");
    expect(metadataContent).toBeDefined();
    const metadata = JSON.parse(metadataContent);
    expect(metadata.changelogType).toBe("markdown");
    expect(metadata.changelog).toBe(`### Bug fixes

Some bugs

### Features

Some feature
`);
});
