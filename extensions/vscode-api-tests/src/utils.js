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
exports.DeferredPromise = exports.poll = exports.suiteRepeat = exports.testRepeat = exports.asPromise = exports.assertNoRpcFromEntry = exports.assertNoRpc = exports.withVerboseLogs = exports.withLogDisabled = exports.delay = exports.disposeAll = exports.revertAllDirty = exports.saveAllEditors = exports.closeAllEditors = exports.pathEquals = exports.deleteFile = exports.createRandomFile = exports.testFs = exports.rndName = void 0;
const assert = __importStar(require("assert"));
const os_1 = require("os");
const crypto = __importStar(require("crypto"));
const vscode = __importStar(require("vscode"));
const memfs_1 = require("./memfs");
function rndName() {
    return crypto.randomBytes(8).toString('hex');
}
exports.rndName = rndName;
exports.testFs = new memfs_1.TestFS('fake-fs', true);
vscode.workspace.registerFileSystemProvider(exports.testFs.scheme, exports.testFs, { isCaseSensitive: exports.testFs.isCaseSensitive });
async function createRandomFile(contents = '', dir = undefined, ext = '') {
    let fakeFile;
    if (dir) {
        assert.strictEqual(dir.scheme, exports.testFs.scheme);
        fakeFile = dir.with({ path: dir.path + '/' + rndName() + ext });
    }
    else {
        fakeFile = vscode.Uri.parse(`${exports.testFs.scheme}:/${rndName() + ext}`);
    }
    exports.testFs.writeFile(fakeFile, typeof contents === 'string' ? Buffer.from(contents) : Buffer.from(contents), { create: true, overwrite: true });
    return fakeFile;
}
exports.createRandomFile = createRandomFile;
async function deleteFile(file) {
    try {
        exports.testFs.delete(file);
        return true;
    }
    catch {
        return false;
    }
}
exports.deleteFile = deleteFile;
function pathEquals(path1, path2) {
    if (process.platform !== 'linux') {
        path1 = path1.toLowerCase();
        path2 = path2.toLowerCase();
    }
    return path1 === path2;
}
exports.pathEquals = pathEquals;
function closeAllEditors() {
    return vscode.commands.executeCommand('workbench.action.closeAllEditors');
}
exports.closeAllEditors = closeAllEditors;
function saveAllEditors() {
    return vscode.commands.executeCommand('workbench.action.files.saveAll');
}
exports.saveAllEditors = saveAllEditors;
async function revertAllDirty() {
    return vscode.commands.executeCommand('_workbench.revertAllDirty');
}
exports.revertAllDirty = revertAllDirty;
function disposeAll(disposables) {
    vscode.Disposable.from(...disposables).dispose();
}
exports.disposeAll = disposeAll;
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.delay = delay;
function withLogLevel(level, runnable) {
    return async () => {
        const logLevel = await vscode.commands.executeCommand('_extensionTests.getLogLevel');
        await vscode.commands.executeCommand('_extensionTests.setLogLevel', level);
        try {
            await runnable();
        }
        finally {
            await vscode.commands.executeCommand('_extensionTests.setLogLevel', logLevel);
        }
    };
}
function withLogDisabled(runnable) {
    return withLogLevel('off', runnable);
}
exports.withLogDisabled = withLogDisabled;
function withVerboseLogs(runnable) {
    return withLogLevel('trace', runnable);
}
exports.withVerboseLogs = withVerboseLogs;
function assertNoRpc() {
    assertNoRpcFromEntry([vscode, 'vscode']);
}
exports.assertNoRpc = assertNoRpc;
function assertNoRpcFromEntry(entry) {
    const symProxy = Symbol.for('rpcProxy');
    const symProtocol = Symbol.for('rpcProtocol');
    const proxyPaths = [];
    const rpcPaths = [];
    function walk(obj, path, seen) {
        if (!obj) {
            return;
        }
        if (typeof obj !== 'object' && typeof obj !== 'function') {
            return;
        }
        if (seen.has(obj)) {
            return;
        }
        seen.add(obj);
        if (obj[symProtocol]) {
            rpcPaths.push(`PROTOCOL via ${path}`);
        }
        if (obj[symProxy]) {
            proxyPaths.push(`PROXY '${obj[symProxy]}' via ${path}`);
        }
        for (const key in obj) {
            walk(obj[key], `${path}.${String(key)}`, seen);
        }
    }
    try {
        walk(entry[0], entry[1], new Set());
    }
    catch (err) {
        assert.fail(err);
    }
    assert.strictEqual(rpcPaths.length, 0, rpcPaths.join('\n'));
    assert.strictEqual(proxyPaths.length, 0, proxyPaths.join('\n')); // happens...
}
exports.assertNoRpcFromEntry = assertNoRpcFromEntry;
async function asPromise(event, timeout = vscode.env.uiKind === vscode.UIKind.Desktop ? 5000 : 15000) {
    const error = new Error('asPromise TIMEOUT reached');
    return new Promise((resolve, reject) => {
        const handle = setTimeout(() => {
            sub.dispose();
            reject(error);
        }, timeout);
        const sub = event(e => {
            clearTimeout(handle);
            sub.dispose();
            resolve(e);
        });
    });
}
exports.asPromise = asPromise;
function testRepeat(n, description, callback) {
    for (let i = 0; i < n; i++) {
        test(`${description} (iteration ${i})`, callback);
    }
}
exports.testRepeat = testRepeat;
function suiteRepeat(n, description, callback) {
    for (let i = 0; i < n; i++) {
        suite(`${description} (iteration ${i})`, callback);
    }
}
exports.suiteRepeat = suiteRepeat;
async function poll(fn, acceptFn, timeoutMessage, retryCount = 200, retryInterval = 100 // millis
) {
    let trial = 1;
    let lastError = '';
    while (true) {
        if (trial > retryCount) {
            throw new Error(`Timeout: ${timeoutMessage} after ${(retryCount * retryInterval) / 1000} seconds.\r${lastError}`);
        }
        let result;
        try {
            result = await fn();
            if (acceptFn(result)) {
                return result;
            }
            else {
                lastError = 'Did not pass accept function';
            }
        }
        catch (e) {
            lastError = Array.isArray(e.stack) ? e.stack.join(os_1.EOL) : e.stack;
        }
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        trial++;
    }
}
exports.poll = poll;
/**
 * Creates a promise whose resolution or rejection can be controlled imperatively.
 */
class DeferredPromise {
    get isRejected() {
        return this.rejected;
    }
    get isResolved() {
        return this.resolved;
    }
    get isSettled() {
        return this.rejected || this.resolved;
    }
    constructor() {
        this.rejected = false;
        this.resolved = false;
        this.p = new Promise((c, e) => {
            this.completeCallback = c;
            this.errorCallback = e;
        });
    }
    complete(value) {
        return new Promise(resolve => {
            this.completeCallback(value);
            this.resolved = true;
            resolve();
        });
    }
    error(err) {
        return new Promise(resolve => {
            this.errorCallback(err);
            this.rejected = true;
            resolve();
        });
    }
    cancel() {
        new Promise(resolve => {
            this.errorCallback(new Error('Canceled'));
            this.rejected = true;
            resolve();
        });
    }
}
exports.DeferredPromise = DeferredPromise;
//# sourceMappingURL=utils.js.map