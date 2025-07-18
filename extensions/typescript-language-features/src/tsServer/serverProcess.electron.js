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
exports.ElectronServiceProcessFactory = void 0;
const child_process = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const dispose_1 = require("../utils/dispose");
const api_1 = require("./api");
const defaultSize = 8192;
const contentLength = 'Content-Length: ';
const contentLengthSize = Buffer.byteLength(contentLength, 'utf8');
const blank = Buffer.from(' ', 'utf8')[0];
const backslashR = Buffer.from('\r', 'utf8')[0];
const backslashN = Buffer.from('\n', 'utf8')[0];
class ProtocolBuffer {
    constructor() {
        this.index = 0;
        this.buffer = Buffer.allocUnsafe(defaultSize);
    }
    append(data) {
        let toAppend = null;
        if (Buffer.isBuffer(data)) {
            toAppend = data;
        }
        else {
            toAppend = Buffer.from(data, 'utf8');
        }
        if (this.buffer.length - this.index >= toAppend.length) {
            toAppend.copy(this.buffer, this.index, 0, toAppend.length);
        }
        else {
            const newSize = (Math.ceil((this.index + toAppend.length) / defaultSize) + 1) * defaultSize;
            if (this.index === 0) {
                this.buffer = Buffer.allocUnsafe(newSize);
                toAppend.copy(this.buffer, 0, 0, toAppend.length);
            }
            else {
                this.buffer = Buffer.concat([this.buffer.slice(0, this.index), toAppend], newSize);
            }
        }
        this.index += toAppend.length;
    }
    tryReadContentLength() {
        let result = -1;
        let current = 0;
        // we are utf8 encoding...
        while (current < this.index && (this.buffer[current] === blank || this.buffer[current] === backslashR || this.buffer[current] === backslashN)) {
            current++;
        }
        if (this.index < current + contentLengthSize) {
            return result;
        }
        current += contentLengthSize;
        const start = current;
        while (current < this.index && this.buffer[current] !== backslashR) {
            current++;
        }
        if (current + 3 >= this.index || this.buffer[current + 1] !== backslashN || this.buffer[current + 2] !== backslashR || this.buffer[current + 3] !== backslashN) {
            return result;
        }
        const data = this.buffer.toString('utf8', start, current);
        result = parseInt(data);
        this.buffer = this.buffer.slice(current + 4);
        this.index = this.index - (current + 4);
        return result;
    }
    tryReadContent(length) {
        if (this.index < length) {
            return null;
        }
        const result = this.buffer.toString('utf8', 0, length);
        let sourceStart = length;
        while (sourceStart < this.index && (this.buffer[sourceStart] === backslashR || this.buffer[sourceStart] === backslashN)) {
            sourceStart++;
        }
        this.buffer.copy(this.buffer, 0, sourceStart);
        this.index = this.index - sourceStart;
        return result;
    }
}
class Reader extends dispose_1.Disposable {
    constructor(readable) {
        super();
        this.buffer = new ProtocolBuffer();
        this.nextMessageLength = -1;
        this._onError = this._register(new vscode.EventEmitter());
        this.onError = this._onError.event;
        this._onData = this._register(new vscode.EventEmitter());
        this.onData = this._onData.event;
        readable.on('data', data => this.onLengthData(data));
    }
    onLengthData(data) {
        if (this.isDisposed) {
            return;
        }
        try {
            this.buffer.append(data);
            while (true) {
                if (this.nextMessageLength === -1) {
                    this.nextMessageLength = this.buffer.tryReadContentLength();
                    if (this.nextMessageLength === -1) {
                        return;
                    }
                }
                const msg = this.buffer.tryReadContent(this.nextMessageLength);
                if (msg === null) {
                    return;
                }
                this.nextMessageLength = -1;
                const json = JSON.parse(msg);
                this._onData.fire(json);
            }
        }
        catch (e) {
            this._onError.fire(e);
        }
    }
}
function generatePatchedEnv(env, modulePath, hasExecPath) {
    const newEnv = Object.assign({}, env);
    if (!hasExecPath) {
        newEnv['ELECTRON_RUN_AS_NODE'] = '1';
    }
    newEnv['NODE_PATH'] = path.join(modulePath, '..', '..', '..');
    // Ensure we always have a PATH set
    newEnv['PATH'] = newEnv['PATH'] || process.env.PATH;
    return newEnv;
}
function getExecArgv(kind, configuration) {
    const args = [];
    const debugPort = getDebugPort(kind);
    if (debugPort) {
        const inspectFlag = getTssDebugBrk() ? '--inspect-brk' : '--inspect';
        args.push(`${inspectFlag}=${debugPort}`);
    }
    if (configuration.maxTsServerMemory) {
        args.push(`--max-old-space-size=${configuration.maxTsServerMemory}`);
    }
    return args;
}
function getDebugPort(kind) {
    if (kind === "syntax" /* TsServerProcessKind.Syntax */) {
        // We typically only want to debug the main semantic server
        return undefined;
    }
    const value = getTssDebugBrk() || getTssDebug();
    if (value) {
        const port = parseInt(value);
        if (!isNaN(port)) {
            return port;
        }
    }
    return undefined;
}
function getTssDebug() {
    return process.env[vscode.env.remoteName ? 'TSS_REMOTE_DEBUG' : 'TSS_DEBUG'];
}
function getTssDebugBrk() {
    return process.env[vscode.env.remoteName ? 'TSS_REMOTE_DEBUG_BRK' : 'TSS_DEBUG_BRK'];
}
class IpcChildServerProcess extends dispose_1.Disposable {
    constructor(_process) {
        super();
        this._process = _process;
    }
    write(serverRequest) {
        this._process.send(serverRequest);
    }
    onData(handler) {
        this._process.on('message', handler);
    }
    onExit(handler) {
        this._process.on('exit', handler);
    }
    onError(handler) {
        this._process.on('error', handler);
    }
    kill() {
        this._process.kill();
    }
}
class StdioChildServerProcess extends dispose_1.Disposable {
    constructor(_process) {
        super();
        this._process = _process;
        this._reader = this._register(new Reader(this._process.stdout));
    }
    write(serverRequest) {
        this._process.stdin.write(JSON.stringify(serverRequest) + '\r\n', 'utf8');
    }
    onData(handler) {
        this._reader.onData(handler);
    }
    onExit(handler) {
        this._process.on('exit', handler);
    }
    onError(handler) {
        this._process.on('error', handler);
        this._reader.onError(handler);
    }
    kill() {
        this._process.kill();
        this._reader.dispose();
    }
}
class ElectronServiceProcessFactory {
    fork(version, args, kind, configuration, versionManager, nodeVersionManager, _tsserverLog) {
        let tsServerPath = version.tsServerPath;
        if (!fs.existsSync(tsServerPath)) {
            vscode.window.showWarningMessage(vscode.l10n.t("The path {0} doesn\'t point to a valid tsserver install. Falling back to bundled TypeScript version.", tsServerPath));
            versionManager.reset();
            tsServerPath = versionManager.currentVersion.tsServerPath;
        }
        const execPath = nodeVersionManager.currentVersion;
        const env = generatePatchedEnv(process.env, tsServerPath, !!execPath);
        const runtimeArgs = [...args];
        const execArgv = getExecArgv(kind, configuration);
        const useIpc = !execPath && version.apiVersion?.gte(api_1.API.v460);
        if (useIpc) {
            runtimeArgs.push('--useNodeIpc');
        }
        const childProcess = execPath ?
            child_process.spawn(execPath, [...execArgv, tsServerPath, ...runtimeArgs], {
                windowsHide: true,
                cwd: undefined,
                env,
            }) :
            child_process.fork(tsServerPath, runtimeArgs, {
                silent: true,
                cwd: undefined,
                env,
                execArgv,
                stdio: useIpc ? ['pipe', 'pipe', 'pipe', 'ipc'] : undefined,
            });
        return useIpc ? new IpcChildServerProcess(childProcess) : new StdioChildServerProcess(childProcess);
    }
}
exports.ElectronServiceProcessFactory = ElectronServiceProcessFactory;
//# sourceMappingURL=serverProcess.electron.js.map