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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const utils_1 = require("../utils");
suite('vscode - automatic language detection', () => {
    teardown(async function () {
        (0, utils_1.assertNoRpc)();
        await (0, utils_1.closeAllEditors)();
    });
    // TODO@TylerLeonhardt https://github.com/microsoft/vscode/issues/135157
    test.skip('test automatic language detection works', async () => {
        const receivedEvent = (0, utils_1.asPromise)(vscode.workspace.onDidOpenTextDocument, 5000);
        const doc = await vscode.workspace.openTextDocument();
        const editor = await vscode.window.showTextDocument(doc);
        await receivedEvent;
        assert.strictEqual(editor.document.languageId, 'plaintext');
        const settingResult = vscode.workspace.getConfiguration().get('workbench.editor.languageDetection');
        assert.ok(settingResult);
        const result = await editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(0, 0), `{
	"extends": "./tsconfig.base.json",
	"compilerOptions": {
		"removeComments": false,
		"preserveConstEnums": true,
		"sourceMap": false,
		"outDir": "../out/vs",
		"target": "es2020",
		"types": [
			"mocha",
			"semver",
			"sinon",
			"winreg",
			"trusted-types",
			"wicg-file-system-access"
		],
		"plugins": [
			{
				"name": "tsec",
				"exemptionConfig": "./tsec.exemptions.json"
			}
		]
	},
	"include": [
		"./typings",
		"./vs"
	]
}`);
        });
        assert.ok(result);
        // Changing the language triggers a file to be closed and opened again so wait for that event to happen.
        let newDoc;
        do {
            newDoc = await (0, utils_1.asPromise)(vscode.workspace.onDidOpenTextDocument, 5000);
        } while (doc.uri.toString() !== newDoc.uri.toString());
        assert.strictEqual(newDoc.languageId, 'json');
    });
});
//# sourceMappingURL=languagedetection.test.js.map