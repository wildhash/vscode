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
exports.removeArrayEntries = exports.testPaths = void 0;
require("mocha");
const vscode = __importStar(require("vscode"));
const fixtureDir = vscode.Uri.joinPath(vscode.Uri.file(__dirname), '../../testWorkspace');
/**
 * A default set of paths shared across tests.
 */
exports.testPaths = {
    fixtureDir,
    cwdParent: vscode.Uri.joinPath(fixtureDir, 'parent'),
    cwd: vscode.Uri.joinPath(fixtureDir, 'parent/home'),
    cwdChild: vscode.Uri.joinPath(fixtureDir, 'parent/home/child'),
};
function removeArrayEntries(array, ...elements) {
    for (const element of elements) {
        const index = array.indexOf(element);
        if (index > -1) {
            array.splice(index, 1);
        }
    }
    return array;
}
exports.removeArrayEntries = removeArrayEntries;
//# sourceMappingURL=helpers.js.map