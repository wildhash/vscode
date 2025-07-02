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
exports.urlToUri = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Tries to convert an url into a vscode uri and returns undefined if this is not possible.
 * `url` can be absolute or relative.
*/
function urlToUri(url, base) {
    try {
        // `vscode.Uri.joinPath` cannot be used, since it understands
        // `src` as path, not as relative url. This is problematic for query args.
        const parsedUrl = new URL(url, base.toString());
        const uri = vscode.Uri.parse(parsedUrl.toString());
        return uri;
    }
    catch (e) {
        // Don't crash if `URL` cannot parse `src`.
        return undefined;
    }
}
exports.urlToUri = urlToUri;
//# sourceMappingURL=url.js.map