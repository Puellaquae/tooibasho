import JSZip from "jszip";
import { Archiver } from "..";
import { saveAs } from "file-saver";
import { isArrayBuffer } from "../utils";
import { join as pathJoin } from "path-browserify";

class ZipArchiver implements Archiver {
    jszip: JSZip

    constructor() {
        this.jszip = new JSZip();
    }

    append(file: string | ArrayBuffer, config: { name: string, paths: string[] }): Archiver {
        this.jszip.file(pathJoin(...config.paths, config.name), file, {
            binary: isArrayBuffer(file)
        })
        return this;
    }

    async package() {
        const blob = await this.jszip.generateAsync({ type: "blob" }, () => {
            /// TODO: Add package process
        })
        saveAs(blob, "archive.zip");
    }
}

export { ZipArchiver }