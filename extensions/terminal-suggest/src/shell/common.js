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
exports.getAliasesHelper = exports.execHelper = exports.spawnHelper2 = exports.spawnHelper = void 0;
const vscode = __importStar(require("vscode"));
const node_child_process_1 = require("node:child_process");
async function spawnHelper(command, args, options) {
    // This must be run with interactive, otherwise there's a good chance aliases won't
    // be set up. Note that this could differ from the actual aliases as it's a new bash
    // session, for the same reason this would not include aliases that are created
    // by simply running `alias ...` in the terminal.
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)(command, args, options);
        let stdout = '';
        child.stdout.on('data', (data) => {
            stdout += data;
        });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`process exited with code ${code}`));
            }
            else {
                resolve(stdout);
            }
        });
    });
}
exports.spawnHelper = spawnHelper;
async function spawnHelper2(command, args, options) {
    // This must be run with interactive, otherwise there's a good chance aliases won't
    // be set up. Note that this could differ from the actual aliases as it's a new bash
    // session, for the same reason this would not include aliases that are created
    // by simply running `alias ...` in the terminal.
    return new Promise((resolve, reject) => {
        const stdout = [];
        const stderr = [];
        const child = (0, node_child_process_1.spawn)(command, args, options);
        child.stdout.on('data', (data) => stdout.push(data));
        child.stderr.on('data', (data) => stderr.push(data));
        child.on('error', (error) => reject(error));
        child.on('close', (code) => {
            resolve({
                stdout: stdout.join(''),
                stderr: stderr.join(''),
                exitCode: code ?? -1
            });
        });
    });
}
exports.spawnHelper2 = spawnHelper2;
async function execHelper(commandLine, options) {
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.exec)(commandLine, options, (error, stdout) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(stdout);
            }
        });
    });
}
exports.execHelper = execHelper;
async function getAliasesHelper(command, args, regex, options) {
    // This must be run with interactive, otherwise there's a good chance aliases won't
    // be set up. Note that this could differ from the actual aliases as it's a new bash
    // session, for the same reason this would not include aliases that are created
    // by simply running `alias ...` in the terminal.
    const aliasOutput = await spawnHelper(command, args, options);
    const result = [];
    for (const line of aliasOutput.split('\n')) {
        const match = line.match(regex);
        if (!match?.groups) {
            continue;
        }
        let definitionCommand = '';
        let definitionIndex = match.groups.resolved.indexOf(' ');
        if (definitionIndex === -1) {
            definitionIndex = match.groups.resolved.length;
        }
        definitionCommand = match.groups.resolved.substring(0, definitionIndex);
        result.push({
            label: { label: match.groups.alias, description: match.groups.resolved },
            detail: match.groups.resolved,
            kind: vscode.TerminalCompletionItemKind.Alias,
            definitionCommand,
        });
    }
    return result;
}
exports.getAliasesHelper = getAliasesHelper;
//# sourceMappingURL=common.js.map