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
exports.TypeScriptVersion = void 0;
const vscode = __importStar(require("vscode"));
class TypeScriptVersion {
    constructor(source, path, apiVersion, _pathLabel) {
        this.source = source;
        this.path = path;
        this.apiVersion = apiVersion;
        this._pathLabel = _pathLabel;
    }
    get tsServerPath() {
        return this.path;
    }
    get pathLabel() {
        return this._pathLabel ?? this.path;
    }
    get isValid() {
        return this.apiVersion !== undefined;
    }
    eq(other) {
        if (this.path !== other.path) {
            return false;
        }
        if (this.apiVersion === other.apiVersion) {
            return true;
        }
        if (!this.apiVersion || !other.apiVersion) {
            return false;
        }
        return this.apiVersion.eq(other.apiVersion);
    }
    get displayName() {
        const version = this.apiVersion;
        return version ? version.displayName : vscode.l10n.t("Could not load the TypeScript version at this path");
    }
}
exports.TypeScriptVersion = TypeScriptVersion;
//# sourceMappingURL=versionProvider.js.map