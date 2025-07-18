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
exports.Log = void 0;
const vscode = __importStar(require("vscode"));
const github_1 = require("../github");
class Log {
    constructor(type) {
        this.type = type;
        const friendlyName = this.type === github_1.AuthProviderType.github ? 'GitHub' : 'GitHub Enterprise';
        this.output = vscode.window.createOutputChannel(`${friendlyName} Authentication`, { log: true });
    }
    trace(message) {
        this.output.trace(message);
    }
    info(message) {
        this.output.info(message);
    }
    error(message) {
        this.output.error(message);
    }
    warn(message) {
        this.output.warn(message);
    }
}
exports.Log = Log;
//# sourceMappingURL=logger.js.map