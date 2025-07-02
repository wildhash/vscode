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
exports.registerCommands = void 0;
const vscode = __importStar(require("vscode"));
const publish_js_1 = require("./publish.js");
const util_js_1 = require("./util.js");
const links_js_1 = require("./links.js");
async function copyVscodeDevLink(gitAPI, useSelection, context, includeRange = true) {
    try {
        const permalink = await (0, links_js_1.getLink)(gitAPI, useSelection, true, (0, links_js_1.getVscodeDevHost)(), 'headlink', context, includeRange);
        if (permalink) {
            return vscode.env.clipboard.writeText(permalink);
        }
    }
    catch (err) {
        if (!(err instanceof vscode.CancellationError)) {
            vscode.window.showErrorMessage(err.message);
        }
    }
}
async function openVscodeDevLink(gitAPI) {
    try {
        const headlink = await (0, links_js_1.getLink)(gitAPI, true, false, (0, links_js_1.getVscodeDevHost)(), 'headlink');
        return headlink ? vscode.Uri.parse(headlink) : undefined;
    }
    catch (err) {
        if (!(err instanceof vscode.CancellationError)) {
            vscode.window.showErrorMessage(err.message);
        }
        return undefined;
    }
}
async function openOnGitHub(repository, commit) {
    // Get the unique remotes that contain the commit
    const branches = await repository.getBranches({ contains: commit, remote: true });
    const remoteNames = new Set(branches.filter(b => b.type === 1 /* RefType.RemoteHead */ && b.remote).map(b => b.remote));
    // GitHub remotes that contain the commit
    const remotes = repository.state.remotes
        .filter(r => remoteNames.has(r.name) && r.fetchUrl && (0, util_js_1.getRepositoryFromUrl)(r.fetchUrl));
    if (remotes.length === 0) {
        vscode.window.showInformationMessage(vscode.l10n.t('No GitHub remotes found that contain this commit.'));
        return;
    }
    // upstream -> origin -> first
    const remote = remotes.find(r => r.name === 'upstream')
        ?? remotes.find(r => r.name === 'origin')
        ?? remotes[0];
    const link = (0, links_js_1.getCommitLink)(remote.fetchUrl, commit);
    vscode.env.openExternal(vscode.Uri.parse(link));
}
function registerCommands(gitAPI) {
    const disposables = new util_js_1.DisposableStore();
    disposables.add(vscode.commands.registerCommand('github.publish', async () => {
        try {
            (0, publish_js_1.publishRepository)(gitAPI);
        }
        catch (err) {
            vscode.window.showErrorMessage(err.message);
        }
    }));
    disposables.add(vscode.commands.registerCommand('github.copyVscodeDevLink', async (context) => {
        return copyVscodeDevLink(gitAPI, true, context);
    }));
    disposables.add(vscode.commands.registerCommand('github.copyVscodeDevLinkFile', async (context) => {
        return copyVscodeDevLink(gitAPI, false, context);
    }));
    disposables.add(vscode.commands.registerCommand('github.copyVscodeDevLinkWithoutRange', async (context) => {
        return copyVscodeDevLink(gitAPI, true, context, false);
    }));
    disposables.add(vscode.commands.registerCommand('github.openOnGitHub', async (url, historyItemId) => {
        const link = (0, links_js_1.getCommitLink)(url, historyItemId);
        vscode.env.openExternal(vscode.Uri.parse(link));
    }));
    disposables.add(vscode.commands.registerCommand('github.graph.openOnGitHub', async (repository, historyItem) => {
        if (!repository || !historyItem) {
            return;
        }
        const apiRepository = gitAPI.repositories.find(r => r.rootUri.fsPath === repository.rootUri?.fsPath);
        if (!apiRepository) {
            return;
        }
        await openOnGitHub(apiRepository, historyItem.id);
    }));
    disposables.add(vscode.commands.registerCommand('github.timeline.openOnGitHub', async (item, uri) => {
        if (!item.id || !uri) {
            return;
        }
        const apiRepository = gitAPI.getRepository(uri);
        if (!apiRepository) {
            return;
        }
        await openOnGitHub(apiRepository, item.id);
    }));
    disposables.add(vscode.commands.registerCommand('github.openOnVscodeDev', async () => {
        return openVscodeDevLink(gitAPI);
    }));
    return disposables;
}
exports.registerCommands = registerCommands;
//# sourceMappingURL=commands.js.map