"use strict";
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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n = __importStar(require("@vscode/l10n"));
async function setupMain() {
    const l10nLog = [];
    const i10lLocation = process.env['VSCODE_L10N_BUNDLE_LOCATION'];
    if (i10lLocation) {
        try {
            await l10n.config({ uri: i10lLocation });
            l10nLog.push(`l10n: Configured to ${i10lLocation.toString()}`);
        }
        catch (e) {
            l10nLog.push(`l10n: Problems loading ${i10lLocation.toString()} : ${e}`);
        }
    }
    await Promise.resolve().then(() => __importStar(require('./htmlServerMain.js')));
    l10nLog.forEach(console.log);
}
setupMain();
//# sourceMappingURL=htmlServerNodeMain.js.map