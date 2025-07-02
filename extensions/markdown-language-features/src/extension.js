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
const node_1 = require("vscode-languageclient/node");
const client_1 = require("./client/client");
const extension_shared_1 = require("./extension.shared");
const logging_1 = require("./logging");
const markdownEngine_1 = require("./markdownEngine");
const markdownExtensions_1 = require("./markdownExtensions");
const slugify_1 = require("./slugify");
async function activate(context) {
    const contributions = (0, markdownExtensions_1.getMarkdownExtensionContributions)(context);
    context.subscriptions.push(contributions);
    const logger = new logging_1.VsCodeOutputLogger();
    context.subscriptions.push(logger);
    const engine = new markdownEngine_1.MarkdownItEngine(contributions, slugify_1.githubSlugifier, logger);
    const client = await startServer(context, engine);
    context.subscriptions.push(client);
    (0, extension_shared_1.activateShared)(context, client, engine, logger, contributions);
}
exports.activate = activate;
function startServer(context, parser) {
    const isDebugBuild = context.extension.packageJSON.main.includes('/out/');
    const serverModule = context.asAbsolutePath(isDebugBuild
        // For local non bundled version of vscode-markdown-languageserver
        // ? './node_modules/vscode-markdown-languageserver/out/node/workerMain'
        ? './node_modules/vscode-markdown-languageserver/dist/node/workerMain'
        : './dist/serverWorkerMain');
    // The debug options for the server
    const debugOptions = { execArgv: ['--nolazy', '--inspect=' + (7000 + Math.round(Math.random() * 999))] };
    // If the extension is launch in debug mode the debug server options are use
    // Otherwise the run options are used
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: { module: serverModule, transport: node_1.TransportKind.ipc, options: debugOptions }
    };
    // pass the location of the localization bundle to the server
    process.env['VSCODE_L10N_BUNDLE_LOCATION'] = vscode.l10n.uri?.toString() ?? '';
    return (0, client_1.startClient)((id, name, clientOptions) => {
        return new node_1.LanguageClient(id, name, serverOptions, clientOptions);
    }, parser);
}
//# sourceMappingURL=extension.js.map