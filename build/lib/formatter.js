"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
class LanguageServiceHost {
    constructor() {
        this.files = {};
        // for ts.LanguageServiceHost
        this.getCompilationSettings = () => typescript_1.default.getDefaultCompilerOptions();
        this.getScriptFileNames = () => Object.keys(this.files);
        this.getScriptVersion = (_fileName) => '0';
        this.getScriptSnapshot = (fileName) => this.files[fileName];
        this.getCurrentDirectory = () => process.cwd();
        this.getDefaultLibFileName = (options) => typescript_1.default.getDefaultLibFilePath(options);
    }
    addFile(fileName, text) {
        this.files[fileName] = typescript_1.default.ScriptSnapshot.fromString(text);
    }
    fileExists(path) {
        return !!this.files[path];
    }
    readFile(path) {
        return this.files[path]?.getText(0, this.files[path].getLength());
    }
}
const defaults = {
    baseIndentSize: 0,
    indentSize: 4,
    tabSize: 4,
    indentStyle: typescript_1.default.IndentStyle.Smart,
    newLineCharacter: '\r\n',
    convertTabsToSpaces: false,
    insertSpaceAfterCommaDelimiter: true,
    insertSpaceAfterSemicolonInForStatements: true,
    insertSpaceBeforeAndAfterBinaryOperators: true,
    insertSpaceAfterConstructor: false,
    insertSpaceAfterKeywordsInControlFlowStatements: true,
    insertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
    insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
    insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
    insertSpaceAfterTypeAssertion: false,
    insertSpaceBeforeFunctionParenthesis: false,
    placeOpenBraceOnNewLineForFunctions: false,
    placeOpenBraceOnNewLineForControlBlocks: false,
    insertSpaceBeforeTypeAnnotation: false,
};
const getOverrides = (() => {
    let value;
    return () => {
        value ?? (value = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', 'tsfmt.json'), 'utf8')));
        return value;
    };
})();
function format(fileName, text) {
    const host = new LanguageServiceHost();
    host.addFile(fileName, text);
    const languageService = typescript_1.default.createLanguageService(host);
    const edits = languageService.getFormattingEditsForDocument(fileName, { ...defaults, ...getOverrides() });
    edits
        .sort((a, b) => a.span.start - b.span.start)
        .reverse()
        .forEach(edit => {
        const head = text.slice(0, edit.span.start);
        const tail = text.slice(edit.span.start + edit.span.length);
        text = `${head}${edit.newText}${tail}`;
    });
    return text;
}
exports.format = format;
//# sourceMappingURL=formatter.js.map