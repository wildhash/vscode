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
exports.BinarySizeStatusBarEntry = void 0;
const vscode = __importStar(require("vscode"));
const ownedStatusBarEntry_1 = require("./ownedStatusBarEntry");
class BinarySize {
    static formatSize(size) {
        if (size < BinarySize.KB) {
            return vscode.l10n.t("{0}B", size);
        }
        if (size < BinarySize.MB) {
            return vscode.l10n.t("{0}KB", (size / BinarySize.KB).toFixed(2));
        }
        if (size < BinarySize.GB) {
            return vscode.l10n.t("{0}MB", (size / BinarySize.MB).toFixed(2));
        }
        if (size < BinarySize.TB) {
            return vscode.l10n.t("{0}GB", (size / BinarySize.GB).toFixed(2));
        }
        return vscode.l10n.t("{0}TB", (size / BinarySize.TB).toFixed(2));
    }
}
BinarySize.KB = 1024;
BinarySize.MB = BinarySize.KB * BinarySize.KB;
BinarySize.GB = BinarySize.MB * BinarySize.KB;
BinarySize.TB = BinarySize.GB * BinarySize.KB;
class BinarySizeStatusBarEntry extends ownedStatusBarEntry_1.PreviewStatusBarEntry {
    constructor() {
        super('status.imagePreview.binarySize', vscode.l10n.t("Image Binary Size"), vscode.StatusBarAlignment.Right, 100);
    }
    show(owner, size) {
        if (typeof size === 'number') {
            super.showItem(owner, BinarySize.formatSize(size));
        }
        else {
            this.hide(owner);
        }
    }
}
exports.BinarySizeStatusBarEntry = BinarySizeStatusBarEntry;
//# sourceMappingURL=binarySizeStatusBarEntry.js.map