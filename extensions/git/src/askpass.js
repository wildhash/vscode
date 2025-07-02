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
exports.Askpass = void 0;
const vscode_1 = require("vscode");
const util_1 = require("./util");
const path = __importStar(require("path"));
class Askpass {
    constructor(ipc, logger) {
        this.ipc = ipc;
        this.logger = logger;
        this.disposable = util_1.EmptyDisposable;
        this.cache = new Map();
        this.credentialsProviders = new Set();
        this.featureDescription = 'git auth provider';
        if (ipc) {
            this.disposable = ipc.registerHandler('askpass', this);
        }
        this.env = {
            // GIT_ASKPASS
            GIT_ASKPASS: path.join(__dirname, this.ipc ? 'askpass.sh' : 'askpass-empty.sh'),
            // VSCODE_GIT_ASKPASS
            VSCODE_GIT_ASKPASS_NODE: process.execPath,
            VSCODE_GIT_ASKPASS_EXTRA_ARGS: '',
            VSCODE_GIT_ASKPASS_MAIN: path.join(__dirname, 'askpass-main.js')
        };
        this.sshEnv = {
            // SSH_ASKPASS
            SSH_ASKPASS: path.join(__dirname, this.ipc ? 'ssh-askpass.sh' : 'ssh-askpass-empty.sh'),
            SSH_ASKPASS_REQUIRE: 'force'
        };
    }
    async handle(payload) {
        this.logger.trace(`[Askpass][handle] ${JSON.stringify(payload)}`);
        const config = vscode_1.workspace.getConfiguration('git', null);
        const enabled = config.get('enabled');
        if (!enabled) {
            this.logger.trace(`[Askpass][handle] Git is disabled`);
            return '';
        }
        return payload.askpassType === 'https'
            ? await this.handleAskpass(payload.argv)
            : await this.handleSSHAskpass(payload.argv);
    }
    async handleAskpass(argv) {
        // HTTPS (username | password)
        // Username for 'https://github.com':
        // Password for 'https://github.com':
        const request = argv[2];
        const host = argv[4].replace(/^["']+|["':]+$/g, '');
        this.logger.trace(`[Askpass][handleAskpass] request: ${request}, host: ${host}`);
        const uri = vscode_1.Uri.parse(host);
        const authority = uri.authority.replace(/^.*@/, '');
        const password = /password/i.test(request);
        const cached = this.cache.get(authority);
        if (cached && password) {
            this.cache.delete(authority);
            return cached.password;
        }
        if (!password) {
            for (const credentialsProvider of this.credentialsProviders) {
                try {
                    const credentials = await credentialsProvider.getCredentials(uri);
                    if (credentials) {
                        this.cache.set(authority, credentials);
                        setTimeout(() => this.cache.delete(authority), 60000);
                        return credentials.username;
                    }
                }
                catch { }
            }
        }
        const options = {
            password,
            placeHolder: request,
            prompt: `Git: ${host}`,
            ignoreFocusOut: true
        };
        return await vscode_1.window.showInputBox(options) || '';
    }
    async handleSSHAskpass(argv) {
        // SSH (passphrase | authenticity)
        const request = argv[3];
        // passphrase
        if (/passphrase/i.test(request)) {
            // Commit signing - Enter passphrase:
            // Git operation  - Enter passphrase for key '/c/Users/<username>/.ssh/id_ed25519':
            const file = argv[6]?.replace(/^["']+|["':]+$/g, '');
            this.logger.trace(`[Askpass][handleSSHAskpass] request: ${request}, file: ${file}`);
            const options = {
                password: true,
                placeHolder: vscode_1.l10n.t('Passphrase'),
                prompt: file ? `SSH Key: ${file}` : undefined,
                ignoreFocusOut: true
            };
            return await vscode_1.window.showInputBox(options) || '';
        }
        // authenticity
        const host = argv[6].replace(/^["']+|["':]+$/g, '');
        const fingerprint = argv[15];
        this.logger.trace(`[Askpass][handleSSHAskpass] request: ${request}, host: ${host}, fingerprint: ${fingerprint}`);
        const options = {
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: vscode_1.l10n.t('Are you sure you want to continue connecting?'),
            title: vscode_1.l10n.t('"{0}" has fingerprint "{1}"', host ?? '', fingerprint ?? '')
        };
        const items = [vscode_1.l10n.t('yes'), vscode_1.l10n.t('no')];
        return await vscode_1.window.showQuickPick(items, options) ?? '';
    }
    getEnv() {
        const config = vscode_1.workspace.getConfiguration('git');
        return config.get('useIntegratedAskPass') ? { ...this.env, ...this.sshEnv } : {};
    }
    getTerminalEnv() {
        const config = vscode_1.workspace.getConfiguration('git');
        return config.get('useIntegratedAskPass') && config.get('terminalAuthentication') ? this.env : {};
    }
    registerCredentialsProvider(provider) {
        this.credentialsProviders.add(provider);
        return (0, util_1.toDisposable)(() => this.credentialsProviders.delete(provider));
    }
    dispose() {
        this.disposable.dispose();
    }
}
exports.Askpass = Askpass;
//# sourceMappingURL=askpass.js.map