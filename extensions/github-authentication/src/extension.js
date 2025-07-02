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
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const github_1 = require("./github");
const settingNotSent = '"github-enterprise.uri" not set';
const settingInvalid = '"github-enterprise.uri" invalid';
class NullAuthProvider {
    constructor(_errorMessage) {
        this._errorMessage = _errorMessage;
        this._onDidChangeSessions = new vscode.EventEmitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._disposable = vscode.authentication.registerAuthenticationProvider('github-enterprise', 'GitHub Enterprise', this);
    }
    createSession() {
        throw new Error(this._errorMessage);
    }
    getSessions() {
        return Promise.resolve([]);
    }
    removeSession() {
        throw new Error(this._errorMessage);
    }
    dispose() {
        this._onDidChangeSessions.dispose();
        this._disposable.dispose();
    }
}
function initGHES(context, uriHandler) {
    const settingValue = vscode.workspace.getConfiguration().get('github-enterprise.uri');
    if (!settingValue) {
        const provider = new NullAuthProvider(settingNotSent);
        context.subscriptions.push(provider);
        return provider;
    }
    // validate user value
    let uri;
    try {
        uri = vscode.Uri.parse(settingValue, true);
    }
    catch (e) {
        vscode.window.showErrorMessage(vscode.l10n.t('GitHub Enterprise Server URI is not a valid URI: {0}', e.message ?? e));
        const provider = new NullAuthProvider(settingInvalid);
        context.subscriptions.push(provider);
        return provider;
    }
    const githubEnterpriseAuthProvider = new github_1.GitHubAuthenticationProvider(context, uriHandler, uri);
    context.subscriptions.push(githubEnterpriseAuthProvider);
    return githubEnterpriseAuthProvider;
}
function activate(context) {
    const uriHandler = new github_1.UriEventHandler();
    context.subscriptions.push(uriHandler);
    context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));
    context.subscriptions.push(new github_1.GitHubAuthenticationProvider(context, uriHandler));
    let before = vscode.workspace.getConfiguration().get('github-enterprise.uri');
    let githubEnterpriseAuthProvider = initGHES(context, uriHandler);
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('github-enterprise.uri')) {
            const after = vscode.workspace.getConfiguration().get('github-enterprise.uri');
            if (before !== after) {
                githubEnterpriseAuthProvider?.dispose();
                before = after;
                githubEnterpriseAuthProvider = initGHES(context, uriHandler);
            }
        }
    }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map