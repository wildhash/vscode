"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapUri = exports.looksLikeNodeModules = exports.looksLikeLibDtsPath = exports.fromResource = exports.PathMapper = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_uri_1 = require("vscode-uri");
class PathMapper {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
        this.projectRootPaths = new Map();
    }
    /**
     * Copied from toResource in typescriptServiceClient.ts
     */
    toResource(filepath) {
        if (looksLikeLibDtsPath(filepath)) {
            return vscode_uri_1.URI.from({
                scheme: this.extensionUri.scheme,
                authority: this.extensionUri.authority,
                path: this.extensionUri.path + '/dist/browser/typescript/' + filepath.slice(1)
            });
        }
        const uri = filePathToResourceUri(filepath);
        if (!uri) {
            throw new Error(`Could not parse path ${filepath}`);
        }
        // Check if TS is trying to read a file outside of the project root.
        // We allow reading files on unknown scheme as these may be loose files opened by the user.
        // However we block reading files on schemes that are on a known file system with an unknown root
        let allowRead = 'implicit';
        for (const projectRoot of this.projectRootPaths.values()) {
            if (uri.scheme === projectRoot.scheme) {
                if (uri.toString().startsWith(projectRoot.toString())) {
                    allowRead = 'allow';
                    break;
                }
                // Tentatively block the read but a future loop may allow it
                allowRead = 'block';
            }
        }
        if (allowRead === 'block') {
            throw new AccessOutsideOfRootError(filepath, Array.from(this.projectRootPaths.keys()));
        }
        return uri;
    }
    addProjectRoot(projectRootPath) {
        const uri = filePathToResourceUri(projectRootPath);
        if (uri) {
            this.projectRootPaths.set(projectRootPath, uri);
        }
    }
}
exports.PathMapper = PathMapper;
class AccessOutsideOfRootError extends Error {
    constructor(filepath, projectRootPaths) {
        super(`Could not read file outside of project root ${filepath}`);
        this.filepath = filepath;
        this.projectRootPaths = projectRootPaths;
    }
}
function fromResource(extensionUri, uri) {
    if (uri.scheme === extensionUri.scheme
        && uri.authority === extensionUri.authority
        && uri.path.startsWith(extensionUri.path + '/dist/browser/typescript/lib.')
        && uri.path.endsWith('.d.ts')) {
        return uri.path;
    }
    return `/${uri.scheme}/${uri.authority}${uri.path}`;
}
exports.fromResource = fromResource;
function looksLikeLibDtsPath(filepath) {
    return filepath.startsWith('/lib.') && filepath.endsWith('.d.ts');
}
exports.looksLikeLibDtsPath = looksLikeLibDtsPath;
function looksLikeNodeModules(filepath) {
    return filepath.includes('/node_modules');
}
exports.looksLikeNodeModules = looksLikeNodeModules;
function filePathToResourceUri(filepath) {
    const parts = filepath.match(/^\/([^\/]+)\/([^\/]*)(?:\/(.+))?$/);
    if (!parts) {
        return undefined;
    }
    const scheme = parts[1];
    const authority = parts[2] === 'ts-nul-authority' ? '' : parts[2];
    const path = parts[3];
    return vscode_uri_1.URI.from({ scheme, authority, path: (path ? '/' + path : path) });
}
function mapUri(uri, mappedScheme) {
    if (uri.scheme === 'vscode-global-typings') {
        throw new Error('can\'t map vscode-global-typings');
    }
    if (!uri.authority) {
        uri = uri.with({ authority: 'ts-nul-authority' });
    }
    uri = uri.with({ scheme: mappedScheme, path: `/${uri.scheme}/${uri.authority || 'ts-nul-authority'}${uri.path}` });
    return uri;
}
exports.mapUri = mapUri;
//# sourceMappingURL=pathMapper.js.map