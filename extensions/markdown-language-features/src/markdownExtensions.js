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
exports.getMarkdownExtensionContributions = exports.MarkdownContributions = void 0;
const vscode = __importStar(require("vscode"));
const arrays = __importStar(require("./util/arrays"));
const dispose_1 = require("./util/dispose");
function resolveExtensionResource(extension, resourcePath) {
    return vscode.Uri.joinPath(extension.extensionUri, resourcePath);
}
function* resolveExtensionResources(extension, resourcePaths) {
    if (Array.isArray(resourcePaths)) {
        for (const resource of resourcePaths) {
            try {
                yield resolveExtensionResource(extension, resource);
            }
            catch {
                // noop
            }
        }
    }
}
var MarkdownContributions;
(function (MarkdownContributions) {
    MarkdownContributions.Empty = {
        previewScripts: [],
        previewStyles: [],
        previewResourceRoots: [],
        markdownItPlugins: new Map()
    };
    function merge(a, b) {
        return {
            previewScripts: [...a.previewScripts, ...b.previewScripts],
            previewStyles: [...a.previewStyles, ...b.previewStyles],
            previewResourceRoots: [...a.previewResourceRoots, ...b.previewResourceRoots],
            markdownItPlugins: new Map([...a.markdownItPlugins.entries(), ...b.markdownItPlugins.entries()]),
        };
    }
    MarkdownContributions.merge = merge;
    function uriEqual(a, b) {
        return a.toString() === b.toString();
    }
    function equal(a, b) {
        return arrays.equals(a.previewScripts, b.previewScripts, uriEqual)
            && arrays.equals(a.previewStyles, b.previewStyles, uriEqual)
            && arrays.equals(a.previewResourceRoots, b.previewResourceRoots, uriEqual)
            && arrays.equals(Array.from(a.markdownItPlugins.keys()), Array.from(b.markdownItPlugins.keys()));
    }
    MarkdownContributions.equal = equal;
    function fromExtension(extension) {
        const contributions = extension.packageJSON?.contributes;
        if (!contributions) {
            return MarkdownContributions.Empty;
        }
        const previewStyles = Array.from(getContributedStyles(contributions, extension));
        const previewScripts = Array.from(getContributedScripts(contributions, extension));
        const previewResourceRoots = previewStyles.length || previewScripts.length ? [extension.extensionUri] : [];
        const markdownItPlugins = getContributedMarkdownItPlugins(contributions, extension);
        return {
            previewScripts,
            previewStyles,
            previewResourceRoots,
            markdownItPlugins
        };
    }
    MarkdownContributions.fromExtension = fromExtension;
    function getContributedMarkdownItPlugins(contributes, extension) {
        const map = new Map();
        if (contributes['markdown.markdownItPlugins']) {
            map.set(extension.id, extension.activate().then(() => {
                if (extension.exports && extension.exports.extendMarkdownIt) {
                    return (md) => extension.exports.extendMarkdownIt(md);
                }
                return (md) => md;
            }));
        }
        return map;
    }
    function getContributedScripts(contributes, extension) {
        return resolveExtensionResources(extension, contributes['markdown.previewScripts']);
    }
    function getContributedStyles(contributes, extension) {
        return resolveExtensionResources(extension, contributes['markdown.previewStyles']);
    }
})(MarkdownContributions = exports.MarkdownContributions || (exports.MarkdownContributions = {}));
class VSCodeExtensionMarkdownContributionProvider extends dispose_1.Disposable {
    constructor(_extensionContext) {
        super();
        this._extensionContext = _extensionContext;
        this._onContributionsChanged = this._register(new vscode.EventEmitter());
        this.onContributionsChanged = this._onContributionsChanged.event;
        this._register(vscode.extensions.onDidChange(() => {
            const currentContributions = this._getCurrentContributions();
            const existingContributions = this._contributions || MarkdownContributions.Empty;
            if (!MarkdownContributions.equal(existingContributions, currentContributions)) {
                this._contributions = currentContributions;
                this._onContributionsChanged.fire(this);
            }
        }));
    }
    get extensionUri() {
        return this._extensionContext.extensionUri;
    }
    get contributions() {
        this._contributions ?? (this._contributions = this._getCurrentContributions());
        return this._contributions;
    }
    _getCurrentContributions() {
        return vscode.extensions.all
            .map(MarkdownContributions.fromExtension)
            .reduce(MarkdownContributions.merge, MarkdownContributions.Empty);
    }
}
function getMarkdownExtensionContributions(context) {
    return new VSCodeExtensionMarkdownContributionProvider(context);
}
exports.getMarkdownExtensionContributions = getMarkdownExtensionContributions;
//# sourceMappingURL=markdownExtensions.js.map