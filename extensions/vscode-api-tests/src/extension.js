"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
function activate(_context) {
    // Set context as a global as some tests depend on it
    global.testExtensionContext = _context;
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map