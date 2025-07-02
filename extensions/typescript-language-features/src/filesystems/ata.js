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
exports.registerAtaSupport = void 0;
const vscode = __importStar(require("vscode"));
const dependentRegistration_1 = require("../languageFeatures/util/dependentRegistration");
const platform_1 = require("../utils/platform");
const autoInstallerFs_1 = require("./autoInstallerFs");
const memFs_1 = require("./memFs");
function registerAtaSupport(logger) {
    if (!(0, platform_1.supportsReadableByteStreams)()) {
        return vscode.Disposable.from();
    }
    return (0, dependentRegistration_1.conditionalRegistration)([
        (0, dependentRegistration_1.requireGlobalConfiguration)('typescript', 'tsserver.web.typeAcquisition.enabled'),
    ], () => {
        return vscode.Disposable.from(
        // Ata
        vscode.workspace.registerFileSystemProvider('vscode-global-typings', new memFs_1.MemFs('global-typings', logger), {
            isCaseSensitive: true,
            isReadonly: false,
        }), 
        // Read accesses to node_modules
        vscode.workspace.registerFileSystemProvider('vscode-node-modules', new autoInstallerFs_1.AutoInstallerFs(logger), {
            isCaseSensitive: true,
            isReadonly: false
        }));
    });
}
exports.registerAtaSupport = registerAtaSupport;
//# sourceMappingURL=ata.js.map