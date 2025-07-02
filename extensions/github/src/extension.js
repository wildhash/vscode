"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode_1 = require("vscode");
const extension_telemetry_1 = require("@vscode/extension-telemetry");
const remoteSourceProvider_js_1 = require("./remoteSourceProvider.js");
const commands_js_1 = require("./commands.js");
const credentialProvider_js_1 = require("./credentialProvider.js");
const util_js_1 = require("./util.js");
const pushErrorHandler_js_1 = require("./pushErrorHandler.js");
const remoteSourcePublisher_js_1 = require("./remoteSourcePublisher.js");
const branchProtection_js_1 = require("./branchProtection.js");
const canonicalUriProvider_js_1 = require("./canonicalUriProvider.js");
const shareProviders_js_1 = require("./shareProviders.js");
const historyItemDetailsProvider_js_1 = require("./historyItemDetailsProvider.js");
const auth_js_1 = require("./auth.js");
function activate(context) {
    const disposables = [];
    context.subscriptions.push(new vscode_1.Disposable(() => vscode_1.Disposable.from(...disposables).dispose()));
    const logger = vscode_1.window.createOutputChannel('GitHub', { log: true });
    disposables.push(logger);
    const onDidChangeLogLevel = (logLevel) => {
        logger.appendLine(vscode_1.l10n.t('Log level: {0}', vscode_1.LogLevel[logLevel]));
    };
    disposables.push(logger.onDidChangeLogLevel(onDidChangeLogLevel));
    onDidChangeLogLevel(logger.logLevel);
    const { aiKey } = context.extension.packageJSON;
    const telemetryReporter = new extension_telemetry_1.TelemetryReporter(aiKey);
    disposables.push(telemetryReporter);
    const octokitService = new auth_js_1.OctokitService();
    disposables.push(octokitService);
    disposables.push(initializeGitBaseExtension());
    disposables.push(initializeGitExtension(context, octokitService, telemetryReporter, logger));
}
exports.activate = activate;
function initializeGitBaseExtension() {
    const disposables = new util_js_1.DisposableStore();
    const initialize = () => {
        try {
            const gitBaseAPI = gitBaseExtension.getAPI(1);
            disposables.add(gitBaseAPI.registerRemoteSourceProvider(new remoteSourceProvider_js_1.GithubRemoteSourceProvider()));
        }
        catch (err) {
            console.error('Could not initialize GitHub extension');
            console.warn(err);
        }
    };
    const onDidChangeGitBaseExtensionEnablement = (enabled) => {
        if (!enabled) {
            disposables.dispose();
        }
        else {
            initialize();
        }
    };
    const gitBaseExtension = vscode_1.extensions.getExtension('vscode.git-base').exports;
    disposables.add(gitBaseExtension.onDidChangeEnablement(onDidChangeGitBaseExtensionEnablement));
    onDidChangeGitBaseExtensionEnablement(gitBaseExtension.enabled);
    return disposables;
}
function setGitHubContext(gitAPI, disposables) {
    if (gitAPI.repositories.find(repo => (0, util_js_1.repositoryHasGitHubRemote)(repo))) {
        vscode_1.commands.executeCommand('setContext', 'github.hasGitHubRepo', true);
    }
    else {
        const openRepoDisposable = gitAPI.onDidOpenRepository(async (e) => {
            await e.status();
            if ((0, util_js_1.repositoryHasGitHubRemote)(e)) {
                vscode_1.commands.executeCommand('setContext', 'github.hasGitHubRepo', true);
                openRepoDisposable.dispose();
            }
        });
        disposables.add(openRepoDisposable);
    }
}
function initializeGitExtension(context, octokitService, telemetryReporter, logger) {
    const disposables = new util_js_1.DisposableStore();
    let gitExtension = vscode_1.extensions.getExtension('vscode.git');
    const initialize = () => {
        gitExtension.activate()
            .then(extension => {
            const onDidChangeGitExtensionEnablement = (enabled) => {
                if (enabled) {
                    const gitAPI = extension.getAPI(1);
                    disposables.add((0, commands_js_1.registerCommands)(gitAPI));
                    disposables.add(new credentialProvider_js_1.GithubCredentialProviderManager(gitAPI));
                    disposables.add(new branchProtection_js_1.GitHubBranchProtectionProviderManager(gitAPI, context.globalState, octokitService, logger, telemetryReporter));
                    disposables.add(gitAPI.registerPushErrorHandler(new pushErrorHandler_js_1.GithubPushErrorHandler(telemetryReporter)));
                    disposables.add(gitAPI.registerRemoteSourcePublisher(new remoteSourcePublisher_js_1.GithubRemoteSourcePublisher(gitAPI)));
                    disposables.add(gitAPI.registerSourceControlHistoryItemDetailsProvider(new historyItemDetailsProvider_js_1.GitHubSourceControlHistoryItemDetailsProvider(gitAPI, octokitService, logger)));
                    disposables.add(new canonicalUriProvider_js_1.GitHubCanonicalUriProvider(gitAPI));
                    disposables.add(new shareProviders_js_1.VscodeDevShareProvider(gitAPI));
                    setGitHubContext(gitAPI, disposables);
                    vscode_1.commands.executeCommand('setContext', 'git-base.gitEnabled', true);
                }
                else {
                    disposables.dispose();
                }
            };
            disposables.add(extension.onDidChangeEnablement(onDidChangeGitExtensionEnablement));
            onDidChangeGitExtensionEnablement(extension.enabled);
        });
    };
    if (gitExtension) {
        initialize();
    }
    else {
        const listener = vscode_1.extensions.onDidChange(() => {
            if (!gitExtension && vscode_1.extensions.getExtension('vscode.git')) {
                gitExtension = vscode_1.extensions.getExtension('vscode.git');
                initialize();
                listener.dispose();
            }
        });
        disposables.add(listener);
    }
    return disposables;
}
//# sourceMappingURL=extension.js.map