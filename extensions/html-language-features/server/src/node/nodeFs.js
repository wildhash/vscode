"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeFileFS = void 0;
const vscode_uri_1 = require("vscode-uri");
const fs = __importStar(require("fs"));
const vscode_css_languageservice_1 = require("vscode-css-languageservice");
function getNodeFileFS() {
    function ensureFileUri(location) {
        if (!location.startsWith('file:')) {
            throw new Error('fileSystemProvider can only handle file URLs');
        }
    }
    return {
        stat(location) {
            ensureFileUri(location);
            return new Promise((c, e) => {
                const uri = vscode_uri_1.URI.parse(location);
                fs.stat(uri.fsPath, (err, stats) => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            return c({ type: vscode_css_languageservice_1.FileType.Unknown, ctime: -1, mtime: -1, size: -1 });
                        }
                        else {
                            return e(err);
                        }
                    }
                    let type = vscode_css_languageservice_1.FileType.Unknown;
                    if (stats.isFile()) {
                        type = vscode_css_languageservice_1.FileType.File;
                    }
                    else if (stats.isDirectory()) {
                        type = vscode_css_languageservice_1.FileType.Directory;
                    }
                    else if (stats.isSymbolicLink()) {
                        type = vscode_css_languageservice_1.FileType.SymbolicLink;
                    }
                    c({
                        type,
                        ctime: stats.ctime.getTime(),
                        mtime: stats.mtime.getTime(),
                        size: stats.size
                    });
                });
            });
        },
        readDirectory(location) {
            ensureFileUri(location);
            return new Promise((c, e) => {
                const path = vscode_uri_1.URI.parse(location).fsPath;
                fs.readdir(path, { withFileTypes: true }, (err, children) => {
                    if (err) {
                        return e(err);
                    }
                    c(children.map(stat => {
                        if (stat.isSymbolicLink()) {
                            return [stat.name, vscode_css_languageservice_1.FileType.SymbolicLink];
                        }
                        else if (stat.isDirectory()) {
                            return [stat.name, vscode_css_languageservice_1.FileType.Directory];
                        }
                        else if (stat.isFile()) {
                            return [stat.name, vscode_css_languageservice_1.FileType.File];
                        }
                        else {
                            return [stat.name, vscode_css_languageservice_1.FileType.Unknown];
                        }
                    }));
                });
            });
        }
    };
}
exports.getNodeFileFS = getNodeFileFS;
//# sourceMappingURL=nodeFs.js.map