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
exports.windowsDefaultExecutableExtensions = exports.isExecutableUnix = exports.isExecutable = void 0;
const os_1 = require("./os");
const fs = __importStar(require("fs/promises"));
function isExecutable(filePath, configuredWindowsExecutableExtensions) {
    if ((0, os_1.osIsWindows)()) {
        const resolvedWindowsExecutableExtensions = resolveWindowsExecutableExtensions(configuredWindowsExecutableExtensions);
        return resolvedWindowsExecutableExtensions.find(ext => filePath.endsWith(ext)) !== undefined;
    }
    return isExecutableUnix(filePath);
}
exports.isExecutable = isExecutable;
async function isExecutableUnix(filePath) {
    try {
        const stats = await fs.stat(filePath);
        // On macOS/Linux, check if the executable bit is set
        return (stats.mode & 0o100) !== 0;
    }
    catch (error) {
        // If the file does not exist or cannot be accessed, it's not executable
        return false;
    }
}
exports.isExecutableUnix = isExecutableUnix;
function resolveWindowsExecutableExtensions(configuredWindowsExecutableExtensions) {
    const resolvedWindowsExecutableExtensions = exports.windowsDefaultExecutableExtensions;
    const excluded = new Set();
    if (configuredWindowsExecutableExtensions) {
        for (const [key, value] of Object.entries(configuredWindowsExecutableExtensions)) {
            if (value === true) {
                resolvedWindowsExecutableExtensions.push(key);
            }
            else {
                excluded.add(key);
            }
        }
    }
    return Array.from(new Set(resolvedWindowsExecutableExtensions)).filter(ext => !excluded.has(ext));
}
exports.windowsDefaultExecutableExtensions = [
    '.exe',
    '.bat',
    '.cmd',
    '.com',
    '.msi',
    '.ps1',
    '.vbs',
    '.js',
    '.jar',
    '.py',
    '.rb',
    '.pl',
    '.sh', // Shell script (via WSL or third-party tools)
];
//# sourceMappingURL=executable.js.map