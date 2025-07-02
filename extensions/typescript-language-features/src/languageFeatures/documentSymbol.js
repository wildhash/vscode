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
exports.register = void 0;
const vscode = __importStar(require("vscode"));
const modifiers_1 = require("../tsServer/protocol/modifiers");
const PConst = __importStar(require("../tsServer/protocol/protocol.const"));
const typeConverters = __importStar(require("../typeConverters"));
const getSymbolKind = (kind) => {
    switch (kind) {
        case PConst.Kind.module: return vscode.SymbolKind.Module;
        case PConst.Kind.class: return vscode.SymbolKind.Class;
        case PConst.Kind.enum: return vscode.SymbolKind.Enum;
        case PConst.Kind.interface: return vscode.SymbolKind.Interface;
        case PConst.Kind.method: return vscode.SymbolKind.Method;
        case PConst.Kind.memberVariable: return vscode.SymbolKind.Property;
        case PConst.Kind.memberGetAccessor: return vscode.SymbolKind.Property;
        case PConst.Kind.memberSetAccessor: return vscode.SymbolKind.Property;
        case PConst.Kind.variable: return vscode.SymbolKind.Variable;
        case PConst.Kind.const: return vscode.SymbolKind.Variable;
        case PConst.Kind.localVariable: return vscode.SymbolKind.Variable;
        case PConst.Kind.function: return vscode.SymbolKind.Function;
        case PConst.Kind.localFunction: return vscode.SymbolKind.Function;
        case PConst.Kind.constructSignature: return vscode.SymbolKind.Constructor;
        case PConst.Kind.constructorImplementation: return vscode.SymbolKind.Constructor;
    }
    return vscode.SymbolKind.Variable;
};
class TypeScriptDocumentSymbolProvider {
    constructor(client, cachedResponse) {
        this.client = client;
        this.cachedResponse = cachedResponse;
    }
    async provideDocumentSymbols(document, token) {
        const file = this.client.toOpenTsFilePath(document);
        if (!file) {
            return undefined;
        }
        const args = { file };
        const response = await this.cachedResponse.execute(document, () => this.client.execute('navtree', args, token));
        if (response.type !== 'response' || !response.body?.childItems) {
            return undefined;
        }
        // The root represents the file. Ignore this when showing in the UI
        const result = [];
        for (const item of response.body.childItems) {
            TypeScriptDocumentSymbolProvider.convertNavTree(document.uri, result, item);
        }
        return result;
    }
    static convertNavTree(resource, output, item) {
        let shouldInclude = TypeScriptDocumentSymbolProvider.shouldInclueEntry(item);
        if (!shouldInclude && !item.childItems?.length) {
            return false;
        }
        const children = new Set(item.childItems || []);
        for (const span of item.spans) {
            const range = typeConverters.Range.fromTextSpan(span);
            const symbolInfo = TypeScriptDocumentSymbolProvider.convertSymbol(item, range);
            for (const child of children) {
                if (child.spans.some(span => !!range.intersection(typeConverters.Range.fromTextSpan(span)))) {
                    const includedChild = TypeScriptDocumentSymbolProvider.convertNavTree(resource, symbolInfo.children, child);
                    shouldInclude = shouldInclude || includedChild;
                    children.delete(child);
                }
            }
            if (shouldInclude) {
                output.push(symbolInfo);
            }
        }
        return shouldInclude;
    }
    static convertSymbol(item, range) {
        const selectionRange = item.nameSpan ? typeConverters.Range.fromTextSpan(item.nameSpan) : range;
        let label = item.text;
        switch (item.kind) {
            case PConst.Kind.memberGetAccessor:
                label = `(get) ${label}`;
                break;
            case PConst.Kind.memberSetAccessor:
                label = `(set) ${label}`;
                break;
        }
        const symbolInfo = new vscode.DocumentSymbol(label, '', getSymbolKind(item.kind), range, range.contains(selectionRange) ? selectionRange : range);
        const kindModifiers = (0, modifiers_1.parseKindModifier)(item.kindModifiers);
        if (kindModifiers.has(PConst.KindModifiers.deprecated)) {
            symbolInfo.tags = [vscode.SymbolTag.Deprecated];
        }
        return symbolInfo;
    }
    static shouldInclueEntry(item) {
        if (item.kind === PConst.Kind.alias) {
            return false;
        }
        return !!(item.text && item.text !== '<function>' && item.text !== '<class>');
    }
}
function register(selector, client, cachedResponse) {
    return vscode.languages.registerDocumentSymbolProvider(selector.syntax, new TypeScriptDocumentSymbolProvider(client, cachedResponse), { label: 'TypeScript' });
}
exports.register = register;
//# sourceMappingURL=documentSymbol.js.map