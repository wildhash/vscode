"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWindows = exports.copyright = exports.cleanupText = exports.execAsync = void 0;
const os_1 = require("os");
const child_process_1 = require("child_process");
const util_1 = require("util");
exports.execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Cleans up text from terminal control sequences and formatting artifacts
 */
function cleanupText(text) {
    // Remove ANSI escape codes
    let cleanedText = text.replace(/\x1b\[\d+m/g, '');
    // Remove backspace sequences (like a\bb which tries to print a, move back, print b)
    // This regex looks for a character followed by a backspace and another character
    const backspaceRegex = /.\x08./g;
    while (backspaceRegex.test(cleanedText)) {
        cleanedText = cleanedText.replace(backspaceRegex, match => match.charAt(2));
    }
    // Remove any remaining backspaces and their preceding characters
    cleanedText = cleanedText.replace(/.\x08/g, '');
    // Remove underscores that are used for formatting in some fish help output
    cleanedText = cleanedText.replace(/_\b/g, '');
    return cleanedText;
}
exports.cleanupText = cleanupText;
/**
 * Copyright notice for generated files
 */
exports.copyright = `/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/`;
/**
 * Checks if the script is running on Windows and exits if so
 */
function checkWindows() {
    if ((0, os_1.platform)() === 'win32') {
        console.error('\x1b[31mThis command is not supported on Windows\x1b[0m');
        process.exit(1);
    }
}
exports.checkWindows = checkWindows;
//# sourceMappingURL=terminalScriptHelpers.js.map