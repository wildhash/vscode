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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode_1 = require("vscode");
const extensionV1 = __importStar(require("./extensionV1"));
const extensionV2 = __importStar(require("./extensionV2"));
const experimentation_1 = require("./common/experimentation");
const telemetryReporter_1 = require("./common/telemetryReporter");
const logger_1 = __importDefault(require("./logger"));
function shouldUseMsal(expService) {
    // First check if there is a setting value to allow user to override the default
    const inspect = vscode_1.workspace.getConfiguration('microsoft-authentication').inspect('implementation');
    if (inspect?.workspaceFolderValue !== undefined) {
        logger_1.default.info(`Acquired MSAL enablement value from 'workspaceFolderValue'. Value: ${inspect.workspaceFolderValue}`);
        return inspect.workspaceFolderValue === 'msal';
    }
    if (inspect?.workspaceValue !== undefined) {
        logger_1.default.info(`Acquired MSAL enablement value from 'workspaceValue'. Value: ${inspect.workspaceValue}`);
        return inspect.workspaceValue === 'msal';
    }
    if (inspect?.globalValue !== undefined) {
        logger_1.default.info(`Acquired MSAL enablement value from 'globalValue'. Value: ${inspect.globalValue}`);
        return inspect.globalValue === 'msal';
    }
    // Then check if the experiment value
    const expValue = expService.getTreatmentVariable('vscode', 'microsoft.useMsal');
    if (expValue !== undefined) {
        logger_1.default.info(`Acquired MSAL enablement value from 'exp'. Value: ${expValue}`);
        return expValue;
    }
    logger_1.default.info('Acquired MSAL enablement value from default. Value: false');
    // If no setting or experiment value is found, default to true
    return true;
}
let useMsal;
async function activate(context) {
    const mainTelemetryReporter = new telemetryReporter_1.MicrosoftAuthenticationTelemetryReporter(context.extension.packageJSON.aiKey);
    const expService = await (0, experimentation_1.createExperimentationService)(context, mainTelemetryReporter, vscode_1.env.uriScheme !== 'vscode');
    useMsal = shouldUseMsal(expService);
    context.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(async (e) => {
        if (!e.affectsConfiguration('microsoft-authentication')) {
            return;
        }
        if (useMsal === shouldUseMsal(expService)) {
            return;
        }
        const reload = vscode_1.l10n.t('Reload');
        const result = await vscode_1.window.showInformationMessage('Reload required', {
            modal: true,
            detail: vscode_1.l10n.t('Microsoft Account configuration has been changed.'),
        }, reload);
        if (result === reload) {
            vscode_1.commands.executeCommand('workbench.action.reloadWindow');
        }
    }));
    const isNodeEnvironment = typeof process !== 'undefined' && typeof process?.versions?.node === 'string';
    // Only activate the new extension if we are not running in a browser environment
    if (useMsal && isNodeEnvironment) {
        await extensionV2.activate(context, mainTelemetryReporter);
    }
    else {
        mainTelemetryReporter.sendActivatedWithClassicImplementationEvent();
        await extensionV1.activate(context, mainTelemetryReporter.telemetryReporter);
    }
}
exports.activate = activate;
function deactivate() {
    if (useMsal) {
        extensionV2.deactivate();
    }
    else {
        extensionV1.deactivate();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map