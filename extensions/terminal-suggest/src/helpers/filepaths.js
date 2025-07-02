"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.filepaths = void 0;
function filepaths(options) {
    return {
        custom: async (tokens, executeCommand, generatorContext) => {
            const fileExtensionsMap = { fileExtensions: options.extensions || [] };
            return [{ type: 'file', _internal: fileExtensionsMap }, { type: 'folder' }];
        },
        trigger: (oldToken, newToken) => {
            return true;
        },
        getQueryTerm: (token) => token
    };
}
exports.filepaths = filepaths;
//# sourceMappingURL=filepaths.js.map