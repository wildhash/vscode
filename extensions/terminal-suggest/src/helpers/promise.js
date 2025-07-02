"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeoutPromise = void 0;
function createTimeoutPromise(timeout, defaultValue) {
    return new Promise(resolve => setTimeout(() => resolve(defaultValue), timeout));
}
exports.createTimeoutPromise = createTimeoutPromise;
//# sourceMappingURL=promise.js.map