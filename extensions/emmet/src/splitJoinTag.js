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
exports.splitJoinTag = void 0;
const vscode = __importStar(require("vscode"));
const util_1 = require("./util");
const parseDocument_1 = require("./parseDocument");
function splitJoinTag() {
    if (!(0, util_1.validate)(false) || !vscode.window.activeTextEditor) {
        return;
    }
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    const rootNode = (0, parseDocument_1.getRootNode)(editor.document, true);
    if (!rootNode) {
        return;
    }
    return editor.edit(editBuilder => {
        Array.from(editor.selections).reverse().forEach(selection => {
            const documentText = document.getText();
            const offset = document.offsetAt(selection.start);
            const nodeToUpdate = (0, util_1.getHtmlFlatNode)(documentText, rootNode, offset, true);
            if (nodeToUpdate) {
                const textEdit = getRangesToReplace(document, nodeToUpdate);
                editBuilder.replace(textEdit.range, textEdit.newText);
            }
        });
    });
}
exports.splitJoinTag = splitJoinTag;
function getRangesToReplace(document, nodeToUpdate) {
    let rangeToReplace;
    let textToReplaceWith;
    if (!nodeToUpdate.open || !nodeToUpdate.close) {
        // Split Tag
        const nodeText = document.getText().substring(nodeToUpdate.start, nodeToUpdate.end);
        const m = nodeText.match(/(\s*\/)?>$/);
        const end = nodeToUpdate.end;
        const start = m ? end - m[0].length : end;
        rangeToReplace = (0, util_1.offsetRangeToVsRange)(document, start, end);
        textToReplaceWith = `></${nodeToUpdate.name}>`;
    }
    else {
        // Join Tag
        const start = nodeToUpdate.open.end - 1;
        const end = nodeToUpdate.end;
        rangeToReplace = (0, util_1.offsetRangeToVsRange)(document, start, end);
        textToReplaceWith = '/>';
        const emmetMode = (0, util_1.getEmmetMode)(document.languageId, {}, []) ?? '';
        const emmetConfig = (0, util_1.getEmmetConfiguration)(emmetMode);
        if (emmetMode && emmetConfig.syntaxProfiles[emmetMode] &&
            (emmetConfig.syntaxProfiles[emmetMode]['selfClosingStyle'] === 'xhtml' || emmetConfig.syntaxProfiles[emmetMode]['self_closing_tag'] === 'xhtml')) {
            textToReplaceWith = ' ' + textToReplaceWith;
        }
    }
    return new vscode.TextEdit(rangeToReplace, textToReplaceWith);
}
//# sourceMappingURL=splitJoinTag.js.map