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
exports.register = void 0;
const vscode = __importStar(require("vscode"));
const fixNames = __importStar(require("../tsServer/protocol/fixNames"));
const typeConverters = __importStar(require("../typeConverters"));
const typescriptService_1 = require("../typescriptService");
const cancellation_1 = require("../utils/cancellation");
const memoize_1 = require("../utils/memoize");
const objects_1 = require("../utils/objects");
const codeAction_1 = require("./util/codeAction");
const dependentRegistration_1 = require("./util/dependentRegistration");
const copilot_1 = require("./util/copilot");
class ApplyCodeActionCommand {
    constructor(client, diagnosticManager, telemetryReporter) {
        this.client = client;
        this.diagnosticManager = diagnosticManager;
        this.telemetryReporter = telemetryReporter;
        this.id = ApplyCodeActionCommand.ID;
    }
    async execute({ document, action, diagnostic, followupAction }) {
        /* __GDPR__
            "quickFix.execute" : {
                "owner": "mjbvz",
                "fixName" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" },
                "${include}": [
                    "${TypeScriptCommonProperties}"
                ]
            }
        */
        this.telemetryReporter.logTelemetry('quickFix.execute', {
            fixName: action.fixName
        });
        this.diagnosticManager.deleteDiagnostic(document.uri, diagnostic);
        const codeActionResult = await (0, codeAction_1.applyCodeActionCommands)(this.client, action.commands, cancellation_1.nulToken);
        await followupAction?.execute();
        return codeActionResult;
    }
}
ApplyCodeActionCommand.ID = '_typescript.applyCodeActionCommand';
class ApplyFixAllCodeAction {
    constructor(client, telemetryReporter) {
        this.client = client;
        this.telemetryReporter = telemetryReporter;
        this.id = ApplyFixAllCodeAction.ID;
    }
    async execute(args) {
        /* __GDPR__
            "quickFixAll.execute" : {
                "owner": "mjbvz",
                "fixName" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" },
                "${include}": [
                    "${TypeScriptCommonProperties}"
                ]
            }
        */
        this.telemetryReporter.logTelemetry('quickFixAll.execute', {
            fixName: args.action.tsAction.fixName
        });
        if (args.action.combinedResponse) {
            await (0, codeAction_1.applyCodeActionCommands)(this.client, args.action.combinedResponse.body.commands, cancellation_1.nulToken);
        }
    }
}
ApplyFixAllCodeAction.ID = '_typescript.applyFixAllCodeAction';
/**
 * Unique set of diagnostics keyed on diagnostic range and error code.
 */
class DiagnosticsSet {
    static from(diagnostics) {
        const values = new Map();
        for (const diagnostic of diagnostics) {
            values.set(DiagnosticsSet.key(diagnostic), diagnostic);
        }
        return new DiagnosticsSet(values);
    }
    static key(diagnostic) {
        const { start, end } = diagnostic.range;
        return `${diagnostic.code}-${start.line},${start.character}-${end.line},${end.character}`;
    }
    constructor(_values) {
        this._values = _values;
    }
    get values() {
        return this._values.values();
    }
    get size() {
        return this._values.size;
    }
}
class VsCodeCodeAction extends vscode.CodeAction {
    constructor(tsAction, title, kind) {
        super(title, kind);
        this.tsAction = tsAction;
    }
}
class VsCodeFixAllCodeAction extends VsCodeCodeAction {
    constructor(tsAction, file, title, kind) {
        super(tsAction, title, kind);
        this.file = file;
    }
}
class CodeActionSet {
    constructor() {
        this._actions = new Set();
        this._fixAllActions = new Map();
        this._aiActions = new Set();
    }
    *values() {
        yield* this._actions;
        yield* this._aiActions;
    }
    addAction(action) {
        if (action.isAI) {
            // there are no separate fixAllActions for AI, and no duplicates, so return immediately
            this._aiActions.add(action);
            return;
        }
        for (const existing of this._actions) {
            if (action.tsAction.fixName === existing.tsAction.fixName && (0, objects_1.equals)(action.edit, existing.edit)) {
                this._actions.delete(existing);
            }
        }
        this._actions.add(action);
        if (action.tsAction.fixId) {
            // If we have an existing fix all action, then make sure it follows this action
            const existingFixAll = this._fixAllActions.get(action.tsAction.fixId);
            if (existingFixAll) {
                this._actions.delete(existingFixAll);
                this._actions.add(existingFixAll);
            }
        }
    }
    addFixAllAction(fixId, action) {
        const existing = this._fixAllActions.get(fixId);
        if (existing) {
            // reinsert action at back of actions list
            this._actions.delete(existing);
        }
        this.addAction(action);
        this._fixAllActions.set(fixId, action);
    }
    hasFixAllAction(fixId) {
        return this._fixAllActions.has(fixId);
    }
}
class SupportedCodeActionProvider {
    constructor(client) {
        this.client = client;
    }
    async getFixableDiagnosticsForContext(diagnostics) {
        const fixableCodes = await this.fixableDiagnosticCodes;
        return DiagnosticsSet.from(diagnostics.filter(diagnostic => typeof diagnostic.code !== 'undefined' && fixableCodes.has(diagnostic.code + '')));
    }
    get fixableDiagnosticCodes() {
        return this.client.execute('getSupportedCodeFixes', null, cancellation_1.nulToken)
            .then(response => response.type === 'response' ? response.body || [] : [])
            .then(codes => new Set(codes));
    }
}
__decorate([
    memoize_1.memoize
], SupportedCodeActionProvider.prototype, "fixableDiagnosticCodes", null);
class TypeScriptQuickFixProvider {
    constructor(client, formattingConfigurationManager, commandManager, diagnosticsManager, telemetryReporter) {
        this.client = client;
        this.formattingConfigurationManager = formattingConfigurationManager;
        this.diagnosticsManager = diagnosticsManager;
        commandManager.register(new copilot_1.CompositeCommand());
        commandManager.register(new ApplyCodeActionCommand(client, diagnosticsManager, telemetryReporter));
        commandManager.register(new ApplyFixAllCodeAction(client, telemetryReporter));
        commandManager.register(new copilot_1.EditorChatFollowUp(client, telemetryReporter));
        this.supportedCodeActionProvider = new SupportedCodeActionProvider(client);
    }
    async provideCodeActions(document, range, context, token) {
        const file = this.client.toOpenTsFilePath(document);
        if (!file) {
            return;
        }
        let diagnostics = context.diagnostics;
        if (this.client.bufferSyncSupport.hasPendingDiagnostics(document.uri)) {
            // Delay for 500ms when there are pending diagnostics before recomputing up-to-date diagnostics.
            await new Promise((resolve) => {
                setTimeout(resolve, 500);
            });
            if (token.isCancellationRequested) {
                return;
            }
            const allDiagnostics = [];
            // Match ranges again after getting new diagnostics
            for (const diagnostic of this.diagnosticsManager.getDiagnostics(document.uri)) {
                if (range.intersection(diagnostic.range)) {
                    const newLen = allDiagnostics.push(diagnostic);
                    if (newLen > TypeScriptQuickFixProvider._maxCodeActionsPerFile) {
                        break;
                    }
                }
            }
            diagnostics = allDiagnostics;
        }
        const fixableDiagnostics = await this.supportedCodeActionProvider.getFixableDiagnosticsForContext(diagnostics);
        if (!fixableDiagnostics.size || token.isCancellationRequested) {
            return;
        }
        await this.formattingConfigurationManager.ensureConfigurationForDocument(document, token);
        if (token.isCancellationRequested) {
            return;
        }
        const results = new CodeActionSet();
        for (const diagnostic of fixableDiagnostics.values) {
            await this.getFixesForDiagnostic(document, file, diagnostic, results, token);
            if (token.isCancellationRequested) {
                return;
            }
        }
        const allActions = Array.from(results.values());
        for (const action of allActions) {
            action.isPreferred = isPreferredFix(action, allActions);
        }
        return allActions;
    }
    async resolveCodeAction(codeAction, token) {
        if (!(codeAction instanceof VsCodeFixAllCodeAction) || !codeAction.tsAction.fixId) {
            return codeAction;
        }
        const arg = {
            scope: {
                type: 'file',
                args: { file: codeAction.file }
            },
            fixId: codeAction.tsAction.fixId,
        };
        const response = await this.client.execute('getCombinedCodeFix', arg, token);
        if (response.type === 'response') {
            codeAction.combinedResponse = response;
            codeAction.edit = typeConverters.WorkspaceEdit.fromFileCodeEdits(this.client, response.body.changes);
        }
        return codeAction;
    }
    async getFixesForDiagnostic(document, file, diagnostic, results, token) {
        const args = {
            ...typeConverters.Range.toFileRangeRequestArgs(file, diagnostic.range),
            errorCodes: [+(diagnostic.code)]
        };
        const response = await this.client.execute('getCodeFixes', args, token);
        if (response.type !== 'response' || !response.body) {
            return results;
        }
        for (const tsCodeFix of response.body) {
            for (const action of this.getFixesForTsCodeAction(document, diagnostic, tsCodeFix)) {
                results.addAction(action);
            }
            this.addFixAllForTsCodeAction(results, document.uri, file, diagnostic, tsCodeFix);
        }
        return results;
    }
    getFixesForTsCodeAction(document, diagnostic, action) {
        const actions = [];
        const codeAction = new VsCodeCodeAction(action, action.description, vscode.CodeActionKind.QuickFix);
        codeAction.edit = (0, codeAction_1.getEditForCodeAction)(this.client, action);
        codeAction.diagnostics = [diagnostic];
        codeAction.ranges = [diagnostic.range];
        codeAction.command = {
            command: ApplyCodeActionCommand.ID,
            arguments: [{ action, diagnostic, document }],
            title: ''
        };
        actions.push(codeAction);
        const copilot = vscode.extensions.getExtension('github.copilot-chat');
        if (copilot?.isActive) {
            let message;
            let expand;
            let title = action.description;
            if (action.fixName === fixNames.classIncorrectlyImplementsInterface) {
                title += ' with Copilot';
                message = `Implement the stubbed-out class members for ${document.getText(diagnostic.range)} with a useful implementation.`;
                expand = { kind: 'code-action', action };
            }
            else if (action.fixName === fixNames.fixClassDoesntImplementInheritedAbstractMember) {
                title += ' with Copilot';
                message = `Implement the stubbed-out class members for ${document.getText(diagnostic.range)} with a useful implementation.`;
                expand = { kind: 'code-action', action };
            }
            else if (action.fixName === fixNames.fixMissingFunctionDeclaration) {
                title = `Implement missing function declaration '${document.getText(diagnostic.range)}' using Copilot`;
                message = `Provide a reasonable implementation of the function ${document.getText(diagnostic.range)} given its type and the context it's called in.`;
                expand = { kind: 'code-action', action };
            }
            else if (action.fixName === fixNames.inferFromUsage) {
                const inferFromBody = new VsCodeCodeAction(action, 'Infer types using Copilot', vscode.CodeActionKind.QuickFix);
                inferFromBody.edit = new vscode.WorkspaceEdit();
                inferFromBody.diagnostics = [diagnostic];
                inferFromBody.ranges = [diagnostic.range];
                inferFromBody.isAI = true;
                inferFromBody.command = {
                    command: copilot_1.EditorChatFollowUp.ID,
                    arguments: [{
                            message: 'Add types to this code. Add separate interfaces when possible. Do not change the code except for adding types.',
                            expand: { kind: 'navtree-function', pos: diagnostic.range.start },
                            document,
                            action: { type: 'quickfix', quickfix: action }
                        }],
                    title: ''
                };
                actions.push(inferFromBody);
            }
            else if (action.fixName === fixNames.addNameToNamelessParameter) {
                const newText = action.changes.map(change => change.textChanges.map(textChange => textChange.newText).join('')).join('');
                title = 'Add meaningful parameter name with Copilot';
                message = `Rename the parameter ${newText} with a more meaningful name.`;
                expand = {
                    kind: 'navtree-function',
                    pos: diagnostic.range.start
                };
            }
            if (expand && message !== undefined) {
                const aiCodeAction = new VsCodeCodeAction(action, title, vscode.CodeActionKind.QuickFix);
                aiCodeAction.edit = (0, codeAction_1.getEditForCodeAction)(this.client, action);
                aiCodeAction.edit?.insert(document.uri, diagnostic.range.start, '');
                aiCodeAction.diagnostics = [diagnostic];
                aiCodeAction.ranges = [diagnostic.range];
                aiCodeAction.isAI = true;
                aiCodeAction.command = {
                    command: copilot_1.CompositeCommand.ID,
                    title: '',
                    arguments: [{
                            command: ApplyCodeActionCommand.ID,
                            arguments: [{ action, diagnostic, document }],
                            title: ''
                        }, {
                            command: copilot_1.EditorChatFollowUp.ID,
                            title: '',
                            arguments: [{
                                    message,
                                    expand,
                                    document,
                                    action: { type: 'quickfix', quickfix: action }
                                }],
                        }],
                };
                actions.push(aiCodeAction);
            }
        }
        return actions;
    }
    addFixAllForTsCodeAction(results, resource, file, diagnostic, tsAction) {
        if (!tsAction.fixId || results.hasFixAllAction(tsAction.fixId)) {
            return results;
        }
        // Make sure there are multiple different diagnostics of the same type in the file
        if (!this.diagnosticsManager.getDiagnostics(resource).some(x => {
            if (x === diagnostic) {
                return false;
            }
            return x.code === diagnostic.code
                || (fixAllErrorCodes.has(x.code) && fixAllErrorCodes.get(x.code) === fixAllErrorCodes.get(diagnostic.code));
        })) {
            return results;
        }
        const action = new VsCodeFixAllCodeAction(tsAction, file, tsAction.fixAllDescription || vscode.l10n.t("{0} (Fix all in file)", tsAction.description), vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.ranges = [diagnostic.range];
        action.command = {
            command: ApplyFixAllCodeAction.ID,
            arguments: [{ action }],
            title: ''
        };
        results.addFixAllAction(tsAction.fixId, action);
        return results;
    }
}
TypeScriptQuickFixProvider._maxCodeActionsPerFile = 1000;
TypeScriptQuickFixProvider.metadata = {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
};
// Some fix all actions can actually fix multiple different diagnostics. Make sure we still show the fix all action
// in such cases
const fixAllErrorCodes = new Map([
    // Missing async
    [2339, 2339],
    [2345, 2339],
]);
const preferredFixes = new Map([
    [fixNames.annotateWithTypeFromJSDoc, { priority: 2 }],
    [fixNames.constructorForDerivedNeedSuperCall, { priority: 2 }],
    [fixNames.extendsInterfaceBecomesImplements, { priority: 2 }],
    [fixNames.awaitInSyncFunction, { priority: 2 }],
    [fixNames.removeUnnecessaryAwait, { priority: 2 }],
    [fixNames.classIncorrectlyImplementsInterface, { priority: 3 }],
    [fixNames.classDoesntImplementInheritedAbstractMember, { priority: 3 }],
    [fixNames.unreachableCode, { priority: 2 }],
    [fixNames.unusedIdentifier, { priority: 2 }],
    [fixNames.forgottenThisPropertyAccess, { priority: 2 }],
    [fixNames.spelling, { priority: 0 }],
    [fixNames.addMissingAwait, { priority: 2 }],
    [fixNames.addMissingOverride, { priority: 2 }],
    [fixNames.addMissingNewOperator, { priority: 2 }],
    [fixNames.fixImport, { priority: 1, thereCanOnlyBeOne: true }],
]);
function isPreferredFix(action, allActions) {
    if (action instanceof VsCodeFixAllCodeAction) {
        return false;
    }
    const fixPriority = preferredFixes.get(action.tsAction.fixName);
    if (!fixPriority) {
        return false;
    }
    return allActions.every(otherAction => {
        if (otherAction === action) {
            return true;
        }
        if (otherAction instanceof VsCodeFixAllCodeAction) {
            return true;
        }
        const otherFixPriority = preferredFixes.get(otherAction.tsAction.fixName);
        if (!otherFixPriority || otherFixPriority.priority < fixPriority.priority) {
            return true;
        }
        else if (otherFixPriority.priority > fixPriority.priority) {
            return false;
        }
        if (fixPriority.thereCanOnlyBeOne && action.tsAction.fixName === otherAction.tsAction.fixName) {
            return false;
        }
        return true;
    });
}
function register(selector, client, fileConfigurationManager, commandManager, diagnosticsManager, telemetryReporter) {
    return (0, dependentRegistration_1.conditionalRegistration)([
        (0, dependentRegistration_1.requireSomeCapability)(client, typescriptService_1.ClientCapability.Semantic),
    ], () => {
        return vscode.languages.registerCodeActionsProvider(selector.semantic, new TypeScriptQuickFixProvider(client, fileConfigurationManager, commandManager, diagnosticsManager, telemetryReporter), TypeScriptQuickFixProvider.metadata);
    });
}
exports.register = register;
//# sourceMappingURL=quickFix.js.map