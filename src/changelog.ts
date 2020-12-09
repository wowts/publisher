export function readChangeLog(content: string, version: string) {
    const lines = content.split("\n");
    const result: string[] = [];
    let inVersion = false;
    const regex = /^(?:\s*)###?\s*\[?([0-9A-Zb-z_\-\.]+)/;
    for (const line of lines) {
        const versionResult = regex.exec(line);
        if (versionResult) {
            if (versionResult[1].indexOf(".") >= 0) {
                inVersion = versionResult[1] === version;
                continue;
            }
        }
        if (inVersion) {
            result.push(line);
        }
    }
    if (result[0] === "") result.shift();
    return result.join("\n");
}
