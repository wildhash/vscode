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
exports.register = void 0;
const vscode = __importStar(require("vscode"));
const api_1 = require("../tsServer/api");
const typeConverters = __importStar(require("../typeConverters"));
const typescriptService_1 = require("../typescriptService");
const dependentRegistration_1 = require("./util/dependentRegistration");
class LinkedEditingSupport {
    constructor(client) {
        this.client = client;
    }
    async provideLinkedEditingRanges(document, position, token) {
        const filepath = this.client.toOpenTsFilePath(document);
        if (!filepath) {
            return undefined;
        }
        const args = typeConverters.Position.toFileLocationRequestArgs(filepath, position);
        const response = await this.client.execute('linkedEditingRange', args, token);
        if (response.type !== 'response' || !response.body) {
            return undefined;
        }
        const wordPattern = response.body.wordPattern ? new RegExp(response.body.wordPattern) : undefined;
        return new vscode.LinkedEditingRanges(response.body.ranges.map(range => typeConverters.Range.fromTextSpan(range)), wordPattern);
    }
}
LinkedEditingSupport.minVersion = api_1.API.v510;
function register(selector, client) {
    return (0, dependentRegistration_1.conditionalRegistration)([
        (0, dependentRegistration_1.requireMinVersion)(client, LinkedEditingSupport.minVersion),
        (0, dependentRegistration_1.requireSomeCapability)(client, typescriptService_1.ClientCapability.Syntax),
    ], () => {
        return vscode.languages.registerLinkedEditingRangeProvider(selector.syntax, new LinkedEditingSupport(client));
    });
}
exports.register = register;
//# sourceMappingURL=linkedEditing.js.map