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
exports.MarkdownPreviewConfigurationManager = exports.MarkdownPreviewConfiguration = void 0;
const vscode = __importStar(require("vscode"));
const arrays_1 = require("../util/arrays");
class MarkdownPreviewConfiguration {
    static getForResource(resource) {
        return new MarkdownPreviewConfiguration(resource);
    }
    constructor(resource) {
        const editorConfig = vscode.workspace.getConfiguration('editor', resource);
        const markdownConfig = vscode.workspace.getConfiguration('markdown', resource);
        const markdownEditorConfig = vscode.workspace.getConfiguration('[markdown]', resource);
        this.scrollBeyondLastLine = editorConfig.get('scrollBeyondLastLine', false);
        this.wordWrap = editorConfig.get('wordWrap', 'off') !== 'off';
        if (markdownEditorConfig && markdownEditorConfig['editor.wordWrap']) {
            this.wordWrap = markdownEditorConfig['editor.wordWrap'] !== 'off';
        }
        this.scrollPreviewWithEditor = !!markdownConfig.get('preview.scrollPreviewWithEditor', true);
        this.scrollEditorWithPreview = !!markdownConfig.get('preview.scrollEditorWithPreview', true);
        this.previewLineBreaks = !!markdownConfig.get('preview.breaks', false);
        this.previewLinkify = !!markdownConfig.get('preview.linkify', true);
        this.previewTypographer = !!markdownConfig.get('preview.typographer', false);
        this.doubleClickToSwitchToEditor = !!markdownConfig.get('preview.doubleClickToSwitchToEditor', true);
        this.markEditorSelection = !!markdownConfig.get('preview.markEditorSelection', true);
        this.fontFamily = markdownConfig.get('preview.fontFamily', undefined);
        this.fontSize = Math.max(8, +markdownConfig.get('preview.fontSize', NaN));
        this.lineHeight = Math.max(0.6, +markdownConfig.get('preview.lineHeight', NaN));
        this.styles = markdownConfig.get('styles', []);
    }
    isEqualTo(otherConfig) {
        for (const key in this) {
            if (this.hasOwnProperty(key) && key !== 'styles') {
                if (this[key] !== otherConfig[key]) {
                    return false;
                }
            }
        }
        return (0, arrays_1.equals)(this.styles, otherConfig.styles);
    }
}
exports.MarkdownPreviewConfiguration = MarkdownPreviewConfiguration;
class MarkdownPreviewConfigurationManager {
    constructor() {
        this._previewConfigurationsForWorkspaces = new Map();
    }
    loadAndCacheConfiguration(resource) {
        const config = MarkdownPreviewConfiguration.getForResource(resource);
        this._previewConfigurationsForWorkspaces.set(this._getKey(resource), config);
        return config;
    }
    hasConfigurationChanged(resource) {
        const key = this._getKey(resource);
        const currentConfig = this._previewConfigurationsForWorkspaces.get(key);
        const newConfig = MarkdownPreviewConfiguration.getForResource(resource);
        return (!currentConfig || !currentConfig.isEqualTo(newConfig));
    }
    _getKey(resource) {
        const folder = vscode.workspace.getWorkspaceFolder(resource);
        return folder ? folder.uri.toString() : '';
    }
}
exports.MarkdownPreviewConfigurationManager = MarkdownPreviewConfigurationManager;
//# sourceMappingURL=previewConfig.js.map