import JSZip from "jszip";
import { Archiver } from "..";
import { saveAs } from "file-saver";
import { isArrayBuffer, pathJoin } from "../utils";

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
    };

    async package() {
        let blob = await this.jszip.generateAsync({ type: "blob" })
        saveAs(blob, "archive.zip");
    }
}

export { ZipArchiver }