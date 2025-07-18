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
const assert = __importStar(require("assert"));
const documentContext_1 = require("../utils/documentContext");
suite('HTML Document Context', () => {
    test('Context', function () {
        const docURI = 'file:///users/test/folder/test.html';
        const rootFolders = [{ name: '', uri: 'file:///users/test/' }];
        const context = (0, documentContext_1.getDocumentContext)(docURI, rootFolders);
        assert.strictEqual(context.resolveReference('/', docURI), 'file:///users/test/');
        assert.strictEqual(context.resolveReference('/message.html', docURI), 'file:///users/test/message.html');
        assert.strictEqual(context.resolveReference('message.html', docURI), 'file:///users/test/folder/message.html');
        assert.strictEqual(context.resolveReference('message.html', 'file:///users/test/'), 'file:///users/test/message.html');
    });
});
//# sourceMappingURL=documentContext.test.js.map