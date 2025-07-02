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
exports.Navigation = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
class Navigation {
    constructor(_view) {
        this._view = _view;
        this._disposables = [];
        this._ctxCanNavigate = new utils_1.ContextKey('references-view.canNavigate');
        this._disposables.push(vscode.commands.registerCommand('references-view.next', () => this.next(false)), vscode.commands.registerCommand('references-view.prev', () => this.previous(false)));
    }
    dispose() {
        vscode.Disposable.from(...this._disposables).dispose();
    }
    update(delegate) {
        this._delegate = delegate;
        this._ctxCanNavigate.set(Boolean(this._delegate));
    }
    _anchor() {
        if (!this._delegate) {
            return undefined;
        }
        const [sel] = this._view.selection;
        if (sel) {
            return sel;
        }
        if (!vscode.window.activeTextEditor) {
            return undefined;
        }
        return this._delegate.nearest(vscode.window.activeTextEditor.document.uri, vscode.window.activeTextEditor.selection.active);
    }
    _open(loc, preserveFocus) {
        vscode.commands.executeCommand('vscode.open', loc.uri, {
            selection: new vscode.Selection(loc.range.start, loc.range.start),
            preserveFocus
        });
    }
    previous(preserveFocus) {
        if (!this._delegate) {
            return;
        }
        const item = this._anchor();
        if (!item) {
            return;
        }
        const newItem = this._delegate.previous(item);
        const newLocation = this._delegate.location(newItem);
        if (newLocation) {
            this._view.reveal(newItem, { select: true, focus: true });
            this._open(newLocation, preserveFocus);
        }
    }
    next(preserveFocus) {
        if (!this._delegate) {
            return;
        }
        const item = this._anchor();
        if (!item) {
            return;
        }
        const newItem = this._delegate.next(item);
        const newLocation = this._delegate.location(newItem);
        if (newLocation) {
            this._view.reveal(newItem, { select: true, focus: true });
            this._open(newLocation, preserveFocus);
        }
    }
}
exports.Navigation = Navigation;
//# sourceMappingURL=navigation.js.map