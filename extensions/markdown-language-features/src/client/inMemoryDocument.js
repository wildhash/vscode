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
exports.InMemoryDocument = void 0;
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const vscode = __importStar(require("vscode"));
class InMemoryDocument {
    constructor(uri, contents, version = 0) {
        this.uri = uri;
        this.version = version;
        this._doc = vscode_languageserver_textdocument_1.TextDocument.create(this.uri.toString(), 'markdown', 0, contents);
    }
    getText(range) {
        return this._doc.getText(range);
    }
    positionAt(offset) {
        const pos = this._doc.positionAt(offset);
        return new vscode.Position(pos.line, pos.character);
    }
}
exports.InMemoryDocument = InMemoryDocument;
//# sourceMappingURL=inMemoryDocument.js.map