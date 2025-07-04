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
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const vscode_uri_1 = require("vscode-uri");
const learnMoreAboutRefactorings_1 = require("../commands/learnMoreAboutRefactorings");
const fileSchemes = __importStar(require("../configuration/fileSchemes"));
const schemes_1 = require("../configuration/schemes");
const api_1 = require("../tsServer/api");
const PConst = __importStar(require("../tsServer/protocol/protocol.const"));
const typeConverters = __importStar(require("../typeConverters"));
const typescriptService_1 = require("../typescriptService");
const arrays_1 = require("../utils/arrays");
const cancellation_1 = require("../utils/cancellation");
const copilot_1 = require("./util/copilot");
const dependentRegistration_1 = require("./util/dependentRegistration");
function toWorkspaceEdit(client, edits) {
    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const edit of edits) {
        const resource = client.toResource(edit.fileName);
        if (resource.scheme === fileSchemes.file) {
            workspaceEdit.createFile(resource, { ignoreIfExists: true });
        }
    }
    typeConverters.WorkspaceEdit.withFileCodeEdits(workspaceEdit, client, edits);
    return workspaceEdit;
}
class DidApplyRefactoringCommand {
    constructor(telemetryReporter) {
        this.telemetryReporter = telemetryReporter;
        this.id = DidApplyRefactoringCommand.ID;
    }
    async execute(args) {
        /* __GDPR__
            "refactor.execute" : {
                "owner": "mjbvz",
                "action" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" },
                "trigger" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" },
                "${include}": [
                    "${TypeScriptCommonProperties}"
                ]
            }
        */
        this.telemetryReporter.logTelemetry('refactor.execute', {
            action: args.action,
            trigger: args.trigger,
        });
    }
}
DidApplyRefactoringCommand.ID = '_typescript.didApplyRefactoring';
class SelectRefactorCommand {
    constructor(client) {
        this.client = client;
        this.id = SelectRefactorCommand.ID;
    }
    async execute(args) {
        const file = this.client.toOpenTsFilePath(args.document);
        if (!file) {
            return;
        }
        const selected = await vscode.window.showQuickPick(args.refactor.actions.map((action) => ({
            action,
            label: action.name,
            description: action.description,
        })));
        if (!selected) {
            return;
        }
        const tsAction = new InlinedCodeAction(this.client, args.document, args.refactor, selected.action, args.rangeOrSelection, args.trigger);
        await tsAction.resolve(cancellation_1.nulToken);
        if (tsAction.edit) {
            if (!(await vscode.workspace.applyEdit(tsAction.edit, { isRefactoring: true }))) {
                vscode.window.showErrorMessage(vscode.l10n.t("Could not apply refactoring"));
                return;
            }
        }
        if (tsAction.command) {
            await vscode.commands.executeCommand(tsAction.command.command, ...(tsAction.command.arguments ?? []));
        }
    }
}
SelectRefactorCommand.ID = '_typescript.selectRefactoring';
class MoveToFileRefactorCommand {
    constructor(client, didApplyCommand) {
        this.client = client;
        this.didApplyCommand = didApplyCommand;
        this.id = MoveToFileRefactorCommand.ID;
    }
    async execute(args) {
        const file = this.client.toOpenTsFilePath(args.document);
        if (!file) {
            return;
        }
        const targetFile = await this.getTargetFile(args.document, file, args.range);
        if (!targetFile || targetFile.toString() === file.toString()) {
            return;
        }
        const fileSuggestionArgs = {
            ...typeConverters.Range.toFileRangeRequestArgs(file, args.range),
            action: 'Move to file',
            refactor: 'Move to file',
            interactiveRefactorArguments: { targetFile },
        };
        const response = await this.client.execute('getEditsForRefactor', fileSuggestionArgs, cancellation_1.nulToken);
        if (response.type !== 'response' || !response.body) {
            return;
        }
        const edit = toWorkspaceEdit(this.client, response.body.edits);
        if (!(await vscode.workspace.applyEdit(edit, { isRefactoring: true }))) {
            vscode.window.showErrorMessage(vscode.l10n.t("Could not apply refactoring"));
            return;
        }
        await this.didApplyCommand.execute({ action: args.action.name, trigger: args.trigger });
    }
    async getTargetFile(document, file, range) {
        const args = typeConverters.Range.toFileRangeRequestArgs(file, range);
        const response = await this.client.execute('getMoveToRefactoringFileSuggestions', args, cancellation_1.nulToken);
        if (response.type !== 'response' || !response.body) {
            return;
        }
        const body = response.body;
        const selectExistingFileItem = { label: vscode.l10n.t("Select existing file...") };
        const selectNewFileItem = { label: vscode.l10n.t("Enter new file path...") };
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const quickPick = vscode.window.createQuickPick();
        quickPick.ignoreFocusOut = true;
        // true so we don't skip computing in the first call
        let quickPickInRelativeMode = true;
        const updateItems = () => {
            const relativeQuery = ['./', '../'].find(str => quickPick.value.startsWith(str));
            if (quickPickInRelativeMode === false && !!relativeQuery === false) {
                return;
            }
            quickPickInRelativeMode = !!relativeQuery;
            const destinationItems = body.files.map((file) => {
                const uri = this.client.toResource(file);
                const parentDir = vscode_uri_1.Utils.dirname(uri);
                const filename = vscode_uri_1.Utils.basename(uri);
                let description;
                if (workspaceFolder) {
                    if (uri.scheme === schemes_1.Schemes.file) {
                        description = path.relative(workspaceFolder.uri.fsPath, parentDir.fsPath);
                    }
                    else {
                        description = path.posix.relative(workspaceFolder.uri.path, parentDir.path);
                    }
                    if (relativeQuery) {
                        const convertRelativePath = (str) => {
                            return !str.startsWith('../') ? `./${str}` : str;
                        };
                        const relativePath = convertRelativePath(path.relative(path.dirname(document.uri.fsPath), uri.fsPath));
                        if (!relativePath.startsWith(relativeQuery)) {
                            return;
                        }
                        description = relativePath;
                    }
                }
                else {
                    description = parentDir.fsPath;
                }
                return {
                    file,
                    label: vscode_uri_1.Utils.basename(uri),
                    description: relativeQuery ? description : path.join(description, filename),
                };
            });
            quickPick.items = [
                selectExistingFileItem,
                selectNewFileItem,
                { label: vscode.l10n.t("destination files"), kind: vscode.QuickPickItemKind.Separator },
                ...(0, arrays_1.coalesce)(destinationItems)
            ];
        };
        quickPick.title = vscode.l10n.t("Move to File");
        quickPick.placeholder = vscode.l10n.t("Enter file path");
        quickPick.matchOnDescription = true;
        quickPick.onDidChangeValue(updateItems);
        updateItems();
        const picked = await new Promise(resolve => {
            quickPick.onDidAccept(() => {
                resolve(quickPick.selectedItems[0]);
                quickPick.dispose();
            });
            quickPick.onDidHide(() => {
                resolve(undefined);
                quickPick.dispose();
            });
            quickPick.show();
        });
        if (!picked) {
            return;
        }
        if (picked === selectExistingFileItem) {
            const picked = await vscode.window.showOpenDialog({
                title: vscode.l10n.t("Select move destination"),
                openLabel: vscode.l10n.t("Move to File"),
                defaultUri: vscode_uri_1.Utils.dirname(document.uri),
            });
            return picked?.length ? this.client.toTsFilePath(picked[0]) : undefined;
        }
        else if (picked === selectNewFileItem) {
            const picked = await vscode.window.showSaveDialog({
                title: vscode.l10n.t("Select move destination"),
                saveLabel: vscode.l10n.t("Move to File"),
                defaultUri: this.client.toResource(response.body.newFileName),
            });
            return picked ? this.client.toTsFilePath(picked) : undefined;
        }
        else {
            return picked.file;
        }
    }
}
MoveToFileRefactorCommand.ID = '_typescript.moveToFileRefactoring';
const Extract_Function = Object.freeze({
    kind: vscode.CodeActionKind.RefactorExtract.append('function'),
    matches: refactor => refactor.name.startsWith('function_')
});
const Extract_Constant = Object.freeze({
    kind: vscode.CodeActionKind.RefactorExtract.append('constant'),
    matches: refactor => refactor.name.startsWith('constant_')
});
const Extract_Type = Object.freeze({
    kind: vscode.CodeActionKind.RefactorExtract.append('type'),
    matches: refactor => refactor.name.startsWith('Extract to type alias')
});
const Extract_Interface = Object.freeze({
    kind: vscode.CodeActionKind.RefactorExtract.append('interface'),
    matches: refactor => refactor.name.startsWith('Extract to interface')
});
const Move_File = Object.freeze({
    kind: vscode.CodeActionKind.RefactorMove.append('file'),
    matches: refactor => refactor.name.startsWith('Move to file')
});
const Move_NewFile = Object.freeze({
    kind: vscode.CodeActionKind.RefactorMove.append('newFile'),
    matches: refactor => refactor.name.startsWith('Move to a new file')
});
const Rewrite_Import = Object.freeze({
    kind: vscode.CodeActionKind.RefactorRewrite.append('import'),
    matches: refactor => refactor.name.startsWith('Convert namespace import') || refactor.name.startsWith('Convert named imports')
});
const Rewrite_Export = Object.freeze({
    kind: vscode.CodeActionKind.RefactorRewrite.append('export'),
    matches: refactor => refactor.name.startsWith('Convert default export') || refactor.name.startsWith('Convert named export')
});
const Rewrite_Arrow_Braces = Object.freeze({
    kind: vscode.CodeActionKind.RefactorRewrite.append('arrow').append('braces'),
    matches: refactor => refactor.name.startsWith('Convert default export') || refactor.name.startsWith('Convert named export')
});
const Rewrite_Parameters_ToDestructured = Object.freeze({
    kind: vscode.CodeActionKind.RefactorRewrite.append('parameters').append('toDestructured'),
    matches: refactor => refactor.name.startsWith('Convert parameters to destructured object')
});
const Rewrite_Property_GenerateAccessors = Object.freeze({
    kind: vscode.CodeActionKind.RefactorRewrite.append('property').append('generateAccessors'),
    matches: refactor => refactor.name.startsWith('Generate \'get\' and \'set\' accessors')
});
const allKnownCodeActionKinds = [
    Extract_Function,
    Extract_Constant,
    Extract_Type,
    Extract_Interface,
    Move_File,
    Move_NewFile,
    Rewrite_Import,
    Rewrite_Export,
    Rewrite_Arrow_Braces,
    Rewrite_Parameters_ToDestructured,
    Rewrite_Property_GenerateAccessors
];
class InlinedCodeAction extends vscode.CodeAction {
    constructor(client, document, refactor, action, range, trigger) {
        const title = action.description;
        super(title, InlinedCodeAction.getKind(action));
        this.client = client;
        this.document = document;
        this.refactor = refactor;
        this.action = action;
        this.range = range;
        if (action.notApplicableReason) {
            this.disabled = { reason: action.notApplicableReason };
        }
        this.command = {
            title,
            command: DidApplyRefactoringCommand.ID,
            arguments: [{ action: action.name, trigger }],
        };
    }
    async resolve(token) {
        const file = this.client.toOpenTsFilePath(this.document);
        if (!file) {
            return;
        }
        const args = {
            ...typeConverters.Range.toFileRangeRequestArgs(file, this.range),
            refactor: this.refactor.name,
            action: this.action.name,
        };
        const response = await this.client.execute('getEditsForRefactor', args, token);
        if (response.type !== 'response' || !response.body) {
            return;
        }
        this.edit = toWorkspaceEdit(this.client, response.body.edits);
        if (!this.edit.size) {
            vscode.window.showErrorMessage(vscode.l10n.t("Could not apply refactoring"));
            return;
        }
        if (response.body.renameLocation) {
            // Disable renames in interactive playground https://github.com/microsoft/vscode/issues/75137
            if (this.document.uri.scheme !== fileSchemes.walkThroughSnippet) {
                this.command = {
                    command: copilot_1.CompositeCommand.ID,
                    title: '',
                    arguments: (0, arrays_1.coalesce)([
                        this.command,
                        {
                            command: 'editor.action.rename',
                            arguments: [[
                                    this.document.uri,
                                    typeConverters.Position.fromLocation(response.body.renameLocation)
                                ]]
                        },
                    ])
                };
            }
        }
    }
    static getKind(refactor) {
        if (refactor.kind) {
            return vscode.CodeActionKind.Empty.append(refactor.kind);
        }
        const match = allKnownCodeActionKinds.find(kind => kind.matches(refactor));
        return match ? match.kind : vscode.CodeActionKind.Refactor;
    }
}
class MoveToFileCodeAction extends vscode.CodeAction {
    constructor(document, action, range, trigger) {
        super(action.description, Move_File.kind);
        if (action.notApplicableReason) {
            this.disabled = { reason: action.notApplicableReason };
        }
        this.command = {
            title: action.description,
            command: MoveToFileRefactorCommand.ID,
            arguments: [{ action, document, range, trigger }]
        };
    }
}
class SelectCodeAction extends vscode.CodeAction {
    constructor(info, document, rangeOrSelection, trigger) {
        super(info.description, vscode.CodeActionKind.Refactor);
        this.command = {
            title: info.description,
            command: SelectRefactorCommand.ID,
            arguments: [{ document, refactor: info, rangeOrSelection, trigger }]
        };
    }
}
class TypeScriptRefactorProvider {
    static isOnSignatureName(node, range) {
        if (this._declarationKinds.has(node.kind)) {
            // Show when on the name span
            if (node.nameSpan) {
                const convertedSpan = typeConverters.Range.fromTextSpan(node.nameSpan);
                if (range.intersection(convertedSpan)) {
                    return true;
                }
            }
            // Show when on the same line as an exported symbols without a name (handles default exports)
            if (!node.nameSpan && /\bexport\b/.test(node.kindModifiers) && node.spans.length) {
                const convertedSpan = typeConverters.Range.fromTextSpan(node.spans[0]);
                if (range.intersection(new vscode.Range(convertedSpan.start.line, 0, convertedSpan.start.line, Number.MAX_SAFE_INTEGER))) {
                    return true;
                }
            }
        }
        // Show if on the signature of any children
        return node.childItems?.some(child => this.isOnSignatureName(child, range)) ?? false;
    }
    constructor(client, cachedNavTree, formattingOptionsManager, commandManager, telemetryReporter) {
        this.client = client;
        this.cachedNavTree = cachedNavTree;
        this.formattingOptionsManager = formattingOptionsManager;
        const didApplyRefactoringCommand = new DidApplyRefactoringCommand(telemetryReporter);
        commandManager.register(didApplyRefactoringCommand);
        commandManager.register(new copilot_1.CompositeCommand());
        commandManager.register(new SelectRefactorCommand(this.client));
        commandManager.register(new MoveToFileRefactorCommand(this.client, didApplyRefactoringCommand));
        commandManager.register(new copilot_1.EditorChatFollowUp(this.client, telemetryReporter));
    }
    async provideCodeActions(document, rangeOrSelection, context, token) {
        if (!this.shouldTrigger(context, rangeOrSelection)) {
            return undefined;
        }
        if (!this.client.toOpenTsFilePath(document)) {
            return undefined;
        }
        const response = await this.interruptGetErrIfNeeded(context, () => {
            const file = this.client.toOpenTsFilePath(document);
            if (!file) {
                return undefined;
            }
            this.formattingOptionsManager.ensureConfigurationForDocument(document, token);
            const args = {
                ...typeConverters.Range.toFileRangeRequestArgs(file, rangeOrSelection),
                triggerReason: this.toTsTriggerReason(context),
                kind: context.only?.value,
                includeInteractiveActions: this.client.apiVersion.gte(api_1.API.v520),
            };
            return this.client.execute('getApplicableRefactors', args, token);
        });
        if (response?.type !== 'response' || !response.body) {
            return undefined;
        }
        const applicableRefactors = this.convertApplicableRefactors(document, context, response.body, rangeOrSelection);
        const actions = (0, arrays_1.coalesce)(await Promise.all(Array.from(applicableRefactors, async (action) => {
            if (this.client.apiVersion.lt(api_1.API.v430)) {
                // Don't show 'infer return type' refactoring unless it has been explicitly requested
                // https://github.com/microsoft/TypeScript/issues/42993
                if (!context.only && action.kind?.value === 'refactor.rewrite.function.returnType') {
                    return undefined;
                }
            }
            // Don't include move actions on auto light bulb unless you are on a declaration name
            if (this.client.apiVersion.lt(api_1.API.v540) && context.triggerKind === vscode.CodeActionTriggerKind.Automatic) {
                if (action.kind?.value === Move_NewFile.kind.value || action.kind?.value === Move_File.kind.value) {
                    const file = this.client.toOpenTsFilePath(document);
                    if (!file) {
                        return undefined;
                    }
                    const navTree = await this.cachedNavTree.execute(document, () => this.client.execute('navtree', { file }, token));
                    if (navTree.type !== 'response' || !navTree.body || !TypeScriptRefactorProvider.isOnSignatureName(navTree.body, rangeOrSelection)) {
                        return undefined;
                    }
                }
            }
            return action;
        })));
        if (!context.only) {
            return actions;
        }
        return this.pruneInvalidActions(this.appendInvalidActions(actions), context.only, /* numberOfInvalid = */ 5);
    }
    interruptGetErrIfNeeded(context, f) {
        // Only interrupt diagnostics computation when code actions are explicitly
        // (such as using the refactor command or a keybinding). This is a clear
        // user action so we want to return results as quickly as possible.
        if (context.triggerKind === vscode.CodeActionTriggerKind.Invoke) {
            return this.client.interruptGetErr(f);
        }
        else {
            return f();
        }
    }
    async resolveCodeAction(codeAction, token) {
        if (codeAction instanceof InlinedCodeAction) {
            await codeAction.resolve(token);
        }
        return codeAction;
    }
    toTsTriggerReason(context) {
        return context.triggerKind === vscode.CodeActionTriggerKind.Invoke ? 'invoked' : 'implicit';
    }
    *convertApplicableRefactors(document, context, refactors, rangeOrSelection) {
        for (const refactor of refactors) {
            if (refactor.inlineable === false) {
                yield new SelectCodeAction(refactor, document, rangeOrSelection, context.triggerKind);
            }
            else {
                for (const action of refactor.actions) {
                    for (const codeAction of this.refactorActionToCodeActions(document, context, refactor, action, rangeOrSelection, refactor.actions)) {
                        yield codeAction;
                    }
                }
            }
        }
    }
    refactorActionToCodeActions(document, context, refactor, action, rangeOrSelection, allActions) {
        const codeActions = [];
        if (action.name === 'Move to file') {
            codeActions.push(new MoveToFileCodeAction(document, action, rangeOrSelection, context.triggerKind));
        }
        else {
            codeActions.push(new InlinedCodeAction(this.client, document, refactor, action, rangeOrSelection, context.triggerKind));
        }
        for (const codeAction of codeActions) {
            codeAction.isPreferred = TypeScriptRefactorProvider.isPreferred(action, allActions);
        }
        return codeActions;
    }
    shouldTrigger(context, rangeOrSelection) {
        if (context.only && !vscode.CodeActionKind.Refactor.contains(context.only)) {
            return false;
        }
        if (context.triggerKind === vscode.CodeActionTriggerKind.Invoke) {
            return true;
        }
        return rangeOrSelection instanceof vscode.Selection;
    }
    static isPreferred(action, allActions) {
        if (Extract_Constant.matches(action)) {
            // Only mark the action with the lowest scope as preferred
            const getScope = (name) => {
                const scope = name.match(/scope_(\d)/)?.[1];
                return scope ? +scope : undefined;
            };
            const scope = getScope(action.name);
            if (typeof scope !== 'number') {
                return false;
            }
            return allActions
                .filter(otherAtion => otherAtion !== action && Extract_Constant.matches(otherAtion))
                .every(otherAction => {
                const otherScope = getScope(otherAction.name);
                return typeof otherScope === 'number' ? scope < otherScope : true;
            });
        }
        if (Extract_Type.matches(action) || Extract_Interface.matches(action)) {
            return true;
        }
        return false;
    }
    appendInvalidActions(actions) {
        if (this.client.apiVersion.gte(api_1.API.v400)) {
            // Invalid actions come from TS server instead
            return actions;
        }
        if (!actions.some(action => action.kind && Extract_Constant.kind.contains(action.kind))) {
            const disabledAction = new vscode.CodeAction(vscode.l10n.t("Extract to constant"), Extract_Constant.kind);
            disabledAction.disabled = {
                reason: vscode.l10n.t("The current selection cannot be extracted"),
            };
            disabledAction.isPreferred = true;
            actions.push(disabledAction);
        }
        if (!actions.some(action => action.kind && Extract_Function.kind.contains(action.kind))) {
            const disabledAction = new vscode.CodeAction(vscode.l10n.t("Extract to function"), Extract_Function.kind);
            disabledAction.disabled = {
                reason: vscode.l10n.t("The current selection cannot be extracted"),
            };
            actions.push(disabledAction);
        }
        return actions;
    }
    pruneInvalidActions(actions, only, numberOfInvalid) {
        if (this.client.apiVersion.lt(api_1.API.v400)) {
            // Older TS version don't return extra actions
            return actions;
        }
        const availableActions = [];
        const invalidCommonActions = [];
        const invalidUncommonActions = [];
        for (const action of actions) {
            if (!action.disabled) {
                availableActions.push(action);
                continue;
            }
            // These are the common refactors that we should always show if applicable.
            if (action.kind && (Extract_Constant.kind.contains(action.kind) || Extract_Function.kind.contains(action.kind))) {
                invalidCommonActions.push(action);
                continue;
            }
            // These are the remaining refactors that we can show if we haven't reached the max limit with just common refactors.
            invalidUncommonActions.push(action);
        }
        const prioritizedActions = [];
        prioritizedActions.push(...invalidCommonActions);
        prioritizedActions.push(...invalidUncommonActions);
        const topNInvalid = prioritizedActions.filter(action => !only || (action.kind && only.contains(action.kind))).slice(0, numberOfInvalid);
        availableActions.push(...topNInvalid);
        return availableActions;
    }
}
TypeScriptRefactorProvider._declarationKinds = new Set([
    PConst.Kind.module,
    PConst.Kind.class,
    PConst.Kind.interface,
    PConst.Kind.function,
    PConst.Kind.enum,
    PConst.Kind.type,
    PConst.Kind.const,
    PConst.Kind.variable,
    PConst.Kind.let,
]);
TypeScriptRefactorProvider.metadata = {
    providedCodeActionKinds: [
        vscode.CodeActionKind.Refactor,
        ...allKnownCodeActionKinds.map(x => x.kind),
    ],
    documentation: [
        {
            kind: vscode.CodeActionKind.Refactor,
            command: {
                command: learnMoreAboutRefactorings_1.LearnMoreAboutRefactoringsCommand.id,
                title: vscode.l10n.t("Learn more about JS/TS refactorings")
            }
        }
    ]
};
function register(selector, client, cachedNavTree, formattingOptionsManager, commandManager, telemetryReporter) {
    return (0, dependentRegistration_1.conditionalRegistration)([
        (0, dependentRegistration_1.requireSomeCapability)(client, typescriptService_1.ClientCapability.Semantic),
    ], () => {
        return vscode.languages.registerCodeActionsProvider(selector.semantic, new TypeScriptRefactorProvider(client, cachedNavTree, formattingOptionsManager, commandManager, telemetryReporter), TypeScriptRefactorProvider.metadata);
    });
}
exports.register = register;
//# sourceMappingURL=refactor.js.map