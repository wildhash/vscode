"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDiagnosticSeverity = exports.getCommitShortHash = exports.fromNow = exports.deltaHistoryItemRefs = exports.Versions = exports.PromiseSource = exports.Limiter = exports.isUndefined = exports.isUndefinedOrNull = exports.isDefined = exports.splitInChunks = exports.relativePathWithNoFallback = exports.relativePath = exports.pathEquals = exports.isDescendant = exports.truncate = exports.detectUnicodeEncoding = exports.readBytes = exports.grep = exports.find = exports.uniqueFilter = exports.mkdirp = exports.groupBy = exports.uniqBy = exports.assign = exports.once = exports.eventToPromise = exports.debounceEvent = exports.onceEvent = exports.done = exports.anyEvent = exports.runAndSubscribeEvent = exports.filterEvent = exports.mapEvent = exports.fireEvent = exports.EmptyDisposable = exports.combinedDisposable = exports.toDisposable = exports.dispose = exports.log = exports.isLinuxSnap = exports.isLinux = exports.isRemote = exports.isWindows = exports.isMacintosh = void 0;
const vscode_1 = require("vscode");
const path_1 = require("path");
const fs_1 = require("fs");
const byline_1 = __importDefault(require("byline"));
exports.isMacintosh = process.platform === 'darwin';
exports.isWindows = process.platform === 'win32';
exports.isRemote = vscode_1.env.remoteName !== undefined;
exports.isLinux = process.platform === 'linux';
exports.isLinuxSnap = exports.isLinux && !!process.env['SNAP'] && !!process.env['SNAP_REVISION'];
function log(...args) {
    console.log.apply(console, ['git:', ...args]);
}
exports.log = log;
function dispose(disposables) {
    disposables.forEach(d => d.dispose());
    return [];
}
exports.dispose = dispose;
function toDisposable(dispose) {
    return { dispose };
}
exports.toDisposable = toDisposable;
function combinedDisposable(disposables) {
    return toDisposable(() => dispose(disposables));
}
exports.combinedDisposable = combinedDisposable;
exports.EmptyDisposable = toDisposable(() => null);
function fireEvent(event) {
    return (listener, thisArgs, disposables) => event(_ => listener.call(thisArgs), null, disposables);
}
exports.fireEvent = fireEvent;
function mapEvent(event, map) {
    return (listener, thisArgs, disposables) => event(i => listener.call(thisArgs, map(i)), null, disposables);
}
exports.mapEvent = mapEvent;
function filterEvent(event, filter) {
    return (listener, thisArgs, disposables) => event(e => filter(e) && listener.call(thisArgs, e), null, disposables);
}
exports.filterEvent = filterEvent;
function runAndSubscribeEvent(event, handler, initial) {
    handler(initial);
    return event(e => handler(e));
}
exports.runAndSubscribeEvent = runAndSubscribeEvent;
function anyEvent(...events) {
    return (listener, thisArgs, disposables) => {
        const result = combinedDisposable(events.map(event => event(i => listener.call(thisArgs, i))));
        disposables?.push(result);
        return result;
    };
}
exports.anyEvent = anyEvent;
function done(promise) {
    return promise.then(() => undefined);
}
exports.done = done;
function onceEvent(event) {
    return (listener, thisArgs, disposables) => {
        const result = event(e => {
            result.dispose();
            return listener.call(thisArgs, e);
        }, null, disposables);
        return result;
    };
}
exports.onceEvent = onceEvent;
function debounceEvent(event, delay) {
    return (listener, thisArgs, disposables) => {
        let timer;
        return event(e => {
            clearTimeout(timer);
            timer = setTimeout(() => listener.call(thisArgs, e), delay);
        }, null, disposables);
    };
}
exports.debounceEvent = debounceEvent;
function eventToPromise(event) {
    return new Promise(c => onceEvent(event)(c));
}
exports.eventToPromise = eventToPromise;
function once(fn) {
    const didRun = false;
    return (...args) => {
        if (didRun) {
            return;
        }
        return fn(...args);
    };
}
exports.once = once;
function assign(destination, ...sources) {
    for (const source of sources) {
        Object.keys(source).forEach(key => destination[key] = source[key]);
    }
    return destination;
}
exports.assign = assign;
function uniqBy(arr, fn) {
    const seen = Object.create(null);
    return arr.filter(el => {
        const key = fn(el);
        if (seen[key]) {
            return false;
        }
        seen[key] = true;
        return true;
    });
}
exports.uniqBy = uniqBy;
function groupBy(arr, fn) {
    return arr.reduce((result, el) => {
        const key = fn(el);
        result[key] = [...(result[key] || []), el];
        return result;
    }, Object.create(null));
}
exports.groupBy = groupBy;
async function mkdirp(path, mode) {
    const mkdir = async () => {
        try {
            await fs_1.promises.mkdir(path, mode);
        }
        catch (err) {
            if (err.code === 'EEXIST') {
                const stat = await fs_1.promises.stat(path);
                if (stat.isDirectory()) {
                    return;
                }
                throw new Error(`'${path}' exists and is not a directory.`);
            }
            throw err;
        }
    };
    // is root?
    if (path === (0, path_1.dirname)(path)) {
        return true;
    }
    try {
        await mkdir();
    }
    catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
        await mkdirp((0, path_1.dirname)(path), mode);
        await mkdir();
    }
    return true;
}
exports.mkdirp = mkdirp;
function uniqueFilter(keyFn) {
    const seen = Object.create(null);
    return element => {
        const key = keyFn(element);
        if (seen[key]) {
            return false;
        }
        seen[key] = true;
        return true;
    };
}
exports.uniqueFilter = uniqueFilter;
function find(array, fn) {
    let result = undefined;
    array.some(e => {
        if (fn(e)) {
            result = e;
            return true;
        }
        return false;
    });
    return result;
}
exports.find = find;
async function grep(filename, pattern) {
    return new Promise((c, e) => {
        const fileStream = (0, fs_1.createReadStream)(filename, { encoding: 'utf8' });
        const stream = (0, byline_1.default)(fileStream);
        stream.on('data', (line) => {
            if (pattern.test(line)) {
                fileStream.close();
                c(true);
            }
        });
        stream.on('error', e);
        stream.on('end', () => c(false));
    });
}
exports.grep = grep;
function readBytes(stream, bytes) {
    return new Promise((complete, error) => {
        let done = false;
        const buffer = Buffer.allocUnsafe(bytes);
        let bytesRead = 0;
        stream.on('data', (data) => {
            const bytesToRead = Math.min(bytes - bytesRead, data.length);
            data.copy(buffer, bytesRead, 0, bytesToRead);
            bytesRead += bytesToRead;
            if (bytesRead === bytes) {
                stream.destroy(); // Will trigger the close event eventually
            }
        });
        stream.on('error', (e) => {
            if (!done) {
                done = true;
                error(e);
            }
        });
        stream.on('close', () => {
            if (!done) {
                done = true;
                complete(buffer.slice(0, bytesRead));
            }
        });
    });
}
exports.readBytes = readBytes;
function detectUnicodeEncoding(buffer) {
    if (buffer.length < 2) {
        return null;
    }
    const b0 = buffer.readUInt8(0);
    const b1 = buffer.readUInt8(1);
    if (b0 === 0xFE && b1 === 0xFF) {
        return "utf16be" /* Encoding.UTF16be */;
    }
    if (b0 === 0xFF && b1 === 0xFE) {
        return "utf16le" /* Encoding.UTF16le */;
    }
    if (buffer.length < 3) {
        return null;
    }
    const b2 = buffer.readUInt8(2);
    if (b0 === 0xEF && b1 === 0xBB && b2 === 0xBF) {
        return "utf8" /* Encoding.UTF8 */;
    }
    return null;
}
exports.detectUnicodeEncoding = detectUnicodeEncoding;
function truncate(value, maxLength = 20, ellipsis = true) {
    return value.length <= maxLength ? value : `${value.substring(0, maxLength)}${ellipsis ? '\u2026' : ''}`;
}
exports.truncate = truncate;
function normalizePath(path) {
    // Windows & Mac are currently being handled
    // as case insensitive file systems in VS Code.
    if (exports.isWindows || exports.isMacintosh) {
        return path.toLowerCase();
    }
    return path;
}
function isDescendant(parent, descendant) {
    if (parent === descendant) {
        return true;
    }
    if (parent.charAt(parent.length - 1) !== path_1.sep) {
        parent += path_1.sep;
    }
    return normalizePath(descendant).startsWith(normalizePath(parent));
}
exports.isDescendant = isDescendant;
function pathEquals(a, b) {
    return normalizePath(a) === normalizePath(b);
}
exports.pathEquals = pathEquals;
/**
 * Given the `repository.root` compute the relative path while trying to preserve
 * the casing of the resource URI. The `repository.root` segment of the path can
 * have a casing mismatch if the folder/workspace is being opened with incorrect
 * casing which is why we attempt to use substring() before relative().
 */
function relativePath(from, to) {
    return relativePathWithNoFallback(from, to) ?? (0, path_1.relative)(from, to);
}
exports.relativePath = relativePath;
function relativePathWithNoFallback(from, to) {
    // There are cases in which the `from` path may contain a trailing separator at
    // the end (ex: "C:\", "\\server\folder\" (Windows) or "/" (Linux/macOS)) which
    // is by design as documented in https://github.com/nodejs/node/issues/1765. If
    // the trailing separator is missing, we add it.
    if (from.charAt(from.length - 1) !== path_1.sep) {
        from += path_1.sep;
    }
    if (isDescendant(from, to) && from.length < to.length) {
        return to.substring(from.length);
    }
    return undefined;
}
exports.relativePathWithNoFallback = relativePathWithNoFallback;
function* splitInChunks(array, maxChunkLength) {
    let current = [];
    let length = 0;
    for (const value of array) {
        let newLength = length + value.length;
        if (newLength > maxChunkLength && current.length > 0) {
            yield current;
            current = [];
            newLength = value.length;
        }
        current.push(value);
        length = newLength;
    }
    if (current.length > 0) {
        yield current;
    }
}
exports.splitInChunks = splitInChunks;
/**
 * @returns whether the provided parameter is defined.
 */
function isDefined(arg) {
    return !isUndefinedOrNull(arg);
}
exports.isDefined = isDefined;
/**
 * @returns whether the provided parameter is undefined or null.
 */
function isUndefinedOrNull(obj) {
    return (isUndefined(obj) || obj === null);
}
exports.isUndefinedOrNull = isUndefinedOrNull;
/**
 * @returns whether the provided parameter is undefined.
 */
function isUndefined(obj) {
    return (typeof obj === 'undefined');
}
exports.isUndefined = isUndefined;
class Limiter {
    constructor(maxDegreeOfParalellism) {
        this.maxDegreeOfParalellism = maxDegreeOfParalellism;
        this.outstandingPromises = [];
        this.runningPromises = 0;
    }
    queue(factory) {
        return new Promise((c, e) => {
            this.outstandingPromises.push({ factory, c, e });
            this.consume();
        });
    }
    consume() {
        while (this.outstandingPromises.length && this.runningPromises < this.maxDegreeOfParalellism) {
            const iLimitedTask = this.outstandingPromises.shift();
            this.runningPromises++;
            const promise = iLimitedTask.factory();
            promise.then(iLimitedTask.c, iLimitedTask.e);
            promise.then(() => this.consumed(), () => this.consumed());
        }
    }
    consumed() {
        this.runningPromises--;
        if (this.outstandingPromises.length > 0) {
            this.consume();
        }
    }
}
exports.Limiter = Limiter;
class PromiseSource {
    constructor() {
        this._onDidComplete = new vscode_1.EventEmitter();
    }
    get promise() {
        if (this._promise) {
            return this._promise;
        }
        return eventToPromise(this._onDidComplete.event).then(completion => {
            if (completion.success) {
                return completion.value;
            }
            else {
                throw completion.err;
            }
        });
    }
    resolve(value) {
        if (!this._promise) {
            this._promise = Promise.resolve(value);
            this._onDidComplete.fire({ success: true, value });
        }
    }
    reject(err) {
        if (!this._promise) {
            this._promise = Promise.reject(err);
            this._onDidComplete.fire({ success: false, err });
        }
    }
}
exports.PromiseSource = PromiseSource;
var Versions;
(function (Versions) {
    function compare(v1, v2) {
        if (typeof v1 === 'string') {
            v1 = fromString(v1);
        }
        if (typeof v2 === 'string') {
            v2 = fromString(v2);
        }
        if (v1.major > v2.major) {
            return 1;
        }
        if (v1.major < v2.major) {
            return -1;
        }
        if (v1.minor > v2.minor) {
            return 1;
        }
        if (v1.minor < v2.minor) {
            return -1;
        }
        if (v1.patch > v2.patch) {
            return 1;
        }
        if (v1.patch < v2.patch) {
            return -1;
        }
        if (v1.pre === undefined && v2.pre !== undefined) {
            return 1;
        }
        if (v1.pre !== undefined && v2.pre === undefined) {
            return -1;
        }
        if (v1.pre !== undefined && v2.pre !== undefined) {
            return v1.pre.localeCompare(v2.pre);
        }
        return 0;
    }
    Versions.compare = compare;
    function from(major, minor, patch, pre) {
        return {
            major: typeof major === 'string' ? parseInt(major, 10) : major,
            minor: typeof minor === 'string' ? parseInt(minor, 10) : minor,
            patch: patch === undefined || patch === null ? 0 : typeof patch === 'string' ? parseInt(patch, 10) : patch,
            pre: pre,
        };
    }
    Versions.from = from;
    function fromString(version) {
        const [ver, pre] = version.split('-');
        const [major, minor, patch] = ver.split('.');
        return from(major, minor, patch, pre);
    }
    Versions.fromString = fromString;
})(Versions = exports.Versions || (exports.Versions = {}));
function deltaHistoryItemRefs(before, after) {
    if (before.length === 0) {
        return { added: after, modified: [], removed: [] };
    }
    const added = [];
    const modified = [];
    const removed = [];
    let beforeIdx = 0;
    let afterIdx = 0;
    while (true) {
        if (beforeIdx === before.length) {
            added.push(...after.slice(afterIdx));
            break;
        }
        if (afterIdx === after.length) {
            removed.push(...before.slice(beforeIdx));
            break;
        }
        const beforeElement = before[beforeIdx];
        const afterElement = after[afterIdx];
        const result = beforeElement.id.localeCompare(afterElement.id);
        if (result === 0) {
            if (beforeElement.revision !== afterElement.revision) {
                // modified
                modified.push(afterElement);
            }
            beforeIdx += 1;
            afterIdx += 1;
        }
        else if (result < 0) {
            // beforeElement is smaller -> before element removed
            removed.push(beforeElement);
            beforeIdx += 1;
        }
        else if (result > 0) {
            // beforeElement is greater -> after element added
            added.push(afterElement);
            afterIdx += 1;
        }
    }
    return { added, modified, removed };
}
exports.deltaHistoryItemRefs = deltaHistoryItemRefs;
const minute = 60;
const hour = minute * 60;
const day = hour * 24;
const week = day * 7;
const month = day * 30;
const year = day * 365;
/**
 * Create a l10n.td difference of the time between now and the specified date.
 * @param date The date to generate the difference from.
 * @param appendAgoLabel Whether to append the " ago" to the end.
 * @param useFullTimeWords Whether to use full words (eg. seconds) instead of
 * shortened (eg. secs).
 * @param disallowNow Whether to disallow the string "now" when the difference
 * is less than 30 seconds.
 */
function fromNow(date, appendAgoLabel, useFullTimeWords, disallowNow) {
    if (typeof date !== 'number') {
        date = date.getTime();
    }
    const seconds = Math.round((new Date().getTime() - date) / 1000);
    if (seconds < -30) {
        return vscode_1.l10n.t('in {0}', fromNow(new Date().getTime() + seconds * 1000, false));
    }
    if (!disallowNow && seconds < 30) {
        return vscode_1.l10n.t('now');
    }
    let value;
    if (seconds < minute) {
        value = seconds;
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} second ago', value)
                    : vscode_1.l10n.t('{0} sec ago', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} seconds ago', value)
                    : vscode_1.l10n.t('{0} secs ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} second', value)
                    : vscode_1.l10n.t('{0} sec', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} seconds', value)
                    : vscode_1.l10n.t('{0} secs', value);
            }
        }
    }
    if (seconds < hour) {
        value = Math.floor(seconds / minute);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} minute ago', value)
                    : vscode_1.l10n.t('{0} min ago', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} minutes ago', value)
                    : vscode_1.l10n.t('{0} mins ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} minute', value)
                    : vscode_1.l10n.t('{0} min', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} minutes', value)
                    : vscode_1.l10n.t('{0} mins', value);
            }
        }
    }
    if (seconds < day) {
        value = Math.floor(seconds / hour);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} hour ago', value)
                    : vscode_1.l10n.t('{0} hr ago', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} hours ago', value)
                    : vscode_1.l10n.t('{0} hrs ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} hour', value)
                    : vscode_1.l10n.t('{0} hr', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} hours', value)
                    : vscode_1.l10n.t('{0} hrs', value);
            }
        }
    }
    if (seconds < week) {
        value = Math.floor(seconds / day);
        if (appendAgoLabel) {
            return value === 1
                ? vscode_1.l10n.t('{0} day ago', value)
                : vscode_1.l10n.t('{0} days ago', value);
        }
        else {
            return value === 1
                ? vscode_1.l10n.t('{0} day', value)
                : vscode_1.l10n.t('{0} days', value);
        }
    }
    if (seconds < month) {
        value = Math.floor(seconds / week);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} week ago', value)
                    : vscode_1.l10n.t('{0} wk ago', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} weeks ago', value)
                    : vscode_1.l10n.t('{0} wks ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} week', value)
                    : vscode_1.l10n.t('{0} wk', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} weeks', value)
                    : vscode_1.l10n.t('{0} wks', value);
            }
        }
    }
    if (seconds < year) {
        value = Math.floor(seconds / month);
        if (appendAgoLabel) {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} month ago', value)
                    : vscode_1.l10n.t('{0} mo ago', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} months ago', value)
                    : vscode_1.l10n.t('{0} mos ago', value);
            }
        }
        else {
            if (value === 1) {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} month', value)
                    : vscode_1.l10n.t('{0} mo', value);
            }
            else {
                return useFullTimeWords
                    ? vscode_1.l10n.t('{0} months', value)
                    : vscode_1.l10n.t('{0} mos', value);
            }
        }
    }
    value = Math.floor(seconds / year);
    if (appendAgoLabel) {
        if (value === 1) {
            return useFullTimeWords
                ? vscode_1.l10n.t('{0} year ago', value)
                : vscode_1.l10n.t('{0} yr ago', value);
        }
        else {
            return useFullTimeWords
                ? vscode_1.l10n.t('{0} years ago', value)
                : vscode_1.l10n.t('{0} yrs ago', value);
        }
    }
    else {
        if (value === 1) {
            return useFullTimeWords
                ? vscode_1.l10n.t('{0} year', value)
                : vscode_1.l10n.t('{0} yr', value);
        }
        else {
            return useFullTimeWords
                ? vscode_1.l10n.t('{0} years', value)
                : vscode_1.l10n.t('{0} yrs', value);
        }
    }
}
exports.fromNow = fromNow;
function getCommitShortHash(scope, hash) {
    const config = vscode_1.workspace.getConfiguration('git', scope);
    const shortHashLength = config.get('commitShortHashLength', 7);
    return hash.substring(0, shortHashLength);
}
exports.getCommitShortHash = getCommitShortHash;
function toDiagnosticSeverity(value) {
    return value === 'error'
        ? vscode_1.DiagnosticSeverity.Error
        : value === 'warning'
            ? vscode_1.DiagnosticSeverity.Warning
            : value === 'information'
                ? vscode_1.DiagnosticSeverity.Information
                : vscode_1.DiagnosticSeverity.Hint;
}
exports.toDiagnosticSeverity = toDiagnosticSeverity;
//# sourceMappingURL=util.js.map