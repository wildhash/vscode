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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OctokitService = exports.getOctokit = exports.getSession = exports.AuthenticationError = void 0;
const vscode_1 = require("vscode");
const https_1 = require("https");
const tunnel_1 = require("tunnel");
const url_1 = require("url");
const util_js_1 = require("./util.js");
class AuthenticationError extends Error {
}
exports.AuthenticationError = AuthenticationError;
function getAgent(url = process.env.HTTPS_PROXY) {
    if (!url) {
        return https_1.globalAgent;
    }
    try {
        const { hostname, port, username, password } = new url_1.URL(url);
        const auth = username && password && `${username}:${password}`;
        return (0, tunnel_1.httpsOverHttp)({ proxy: { host: hostname, port, proxyAuth: auth } });
    }
    catch (e) {
        vscode_1.window.showErrorMessage(`HTTPS_PROXY environment variable ignored: ${e.message}`);
        return https_1.globalAgent;
    }
}
const scopes = ['repo', 'workflow', 'user:email', 'read:user'];
async function getSession() {
    return await vscode_1.authentication.getSession('github', scopes, { createIfNone: true });
}
exports.getSession = getSession;
let _octokit;
function getOctokit() {
    if (!_octokit) {
        _octokit = getSession().then(async (session) => {
            const token = session.accessToken;
            const agent = getAgent();
            const { Octokit } = await Promise.resolve().then(() => __importStar(require('@octokit/rest')));
            return new Octokit({
                request: { agent },
                userAgent: 'GitHub VSCode',
                auth: `token ${token}`
            });
        }).then(null, async (err) => {
            _octokit = undefined;
            throw err;
        });
    }
    return _octokit;
}
exports.getOctokit = getOctokit;
class OctokitService {
    constructor() {
        this._onDidChangeSessions = new vscode_1.EventEmitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._disposables = new util_js_1.DisposableStore();
        this._disposables.add(this._onDidChangeSessions);
        this._disposables.add(vscode_1.authentication.onDidChangeSessions(e => {
            if (e.provider.id === 'github') {
                this._octokitGraphql = undefined;
                this._onDidChangeSessions.fire();
            }
        }));
    }
    async getOctokitGraphql() {
        if (!this._octokitGraphql) {
            try {
                const session = await vscode_1.authentication.getSession('github', scopes, { silent: true });
                if (!session) {
                    throw new AuthenticationError('No GitHub authentication session available.');
                }
                const token = session.accessToken;
                const { graphql } = await Promise.resolve().then(() => __importStar(require('@octokit/graphql')));
                this._octokitGraphql = graphql.defaults({
                    headers: {
                        authorization: `token ${token}`
                    },
                    request: {
                        agent: getAgent()
                    }
                });
                return this._octokitGraphql;
            }
            catch (err) {
                this._octokitGraphql = undefined;
                throw new AuthenticationError(err.message);
            }
        }
        return this._octokitGraphql;
    }
    dispose() {
        this._octokitGraphql = undefined;
        this._disposables.dispose();
    }
}
__decorate([
    util_js_1.sequentialize
], OctokitService.prototype, "getOctokitGraphql", null);
exports.OctokitService = OctokitService;
//# sourceMappingURL=auth.js.map