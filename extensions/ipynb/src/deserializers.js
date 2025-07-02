"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.jupyterNotebookModelToNotebookData = exports.jupyterCellOutputToCellOutput = exports.getPreferredLanguage = void 0;
const vscode_1 = require("vscode");
const constants_1 = require("./constants");
const jupyterLanguageToMonacoLanguageMapping = new Map([
    ['c#', 'csharp'],
    ['f#', 'fsharp'],
    ['q#', 'qsharp'],
    ['c++11', 'c++'],
    ['c++12', 'c++'],
    ['c++14', 'c++']
]);
function getPreferredLanguage(metadata) {
    const jupyterLanguage = metadata?.language_info?.name ||
        metadata?.kernelspec?.language;
    // Default to python language only if the Python extension is installed.
    const defaultLanguage = vscode_1.extensions.getExtension('ms-python.python')
        ? 'python'
        : (vscode_1.extensions.getExtension('ms-dotnettools.dotnet-interactive-vscode') ? 'csharp' : 'python');
    // Note, whatever language is returned here, when the user selects a kernel, the cells (of blank documents) get updated based on that kernel selection.
    return translateKernelLanguageToMonaco(jupyterLanguage || defaultLanguage);
}
exports.getPreferredLanguage = getPreferredLanguage;
function translateKernelLanguageToMonaco(language) {
    language = language.toLowerCase();
    if (language.length === 2 && language.endsWith('#')) {
        return `${language.substring(0, 1)}sharp`;
    }
    return jupyterLanguageToMonacoLanguageMapping.get(language) || language;
}
const orderOfMimeTypes = [
    'application/vnd.*',
    'application/vdom.*',
    'application/geo+json',
    'application/x-nteract-model-debug+json',
    'text/html',
    'application/javascript',
    'image/gif',
    'text/latex',
    'text/markdown',
    'image/png',
    'image/svg+xml',
    'image/jpeg',
    'application/json',
    'text/plain'
];
function isEmptyVendoredMimeType(outputItem) {
    if (outputItem.mime.startsWith('application/vnd.')) {
        try {
            return outputItem.data.byteLength === 0 || Buffer.from(outputItem.data).toString().length === 0;
        }
        catch { }
    }
    return false;
}
function isMimeTypeMatch(value, compareWith) {
    if (value.endsWith('.*')) {
        value = value.substr(0, value.indexOf('.*'));
    }
    return compareWith.startsWith(value);
}
function sortOutputItemsBasedOnDisplayOrder(outputItems) {
    return outputItems
        .map(item => {
        let index = orderOfMimeTypes.findIndex((mime) => isMimeTypeMatch(mime, item.mime));
        // Sometimes we can have mime types with empty data, e.g. when using holoview we can have `application/vnd.holoviews_load.v0+json` with empty value.
        // & in these cases we have HTML/JS and those take precedence.
        // https://github.com/microsoft/vscode-jupyter/issues/6109
        if (isEmptyVendoredMimeType(item)) {
            index = -1;
        }
        index = index === -1 ? 100 : index;
        return {
            item, index
        };
    })
        .sort((outputItemA, outputItemB) => outputItemA.index - outputItemB.index).map(item => item.item);
}
/**
 * Concatenates a multiline string or an array of strings into a single string.
 * Also normalizes line endings to use LF (`\n`) instead of CRLF (`\r\n`).
 * Same is done in serializer as well.
 */
function concatMultilineCellSource(source) {
    return concatMultilineString(source).replace(/\r\n/g, '\n');
}
function concatMultilineString(str) {
    if (Array.isArray(str)) {
        let result = '';
        for (let i = 0; i < str.length; i += 1) {
            const s = str[i];
            if (i < str.length - 1 && !s.endsWith('\n')) {
                result = result.concat(`${s}\n`);
            }
            else {
                result = result.concat(s);
            }
        }
        return result;
    }
    return str.toString();
}
function convertJupyterOutputToBuffer(mime, value) {
    if (!value) {
        return vscode_1.NotebookCellOutputItem.text('', mime);
    }
    try {
        if ((mime.startsWith('text/') || constants_1.textMimeTypes.includes(mime)) &&
            (Array.isArray(value) || typeof value === 'string')) {
            const stringValue = Array.isArray(value) ? concatMultilineString(value) : value;
            return vscode_1.NotebookCellOutputItem.text(stringValue, mime);
        }
        else if (mime.startsWith('image/') && typeof value === 'string' && mime !== 'image/svg+xml') {
            // Images in Jupyter are stored in base64 encoded format.
            // VS Code expects bytes when rendering images.
            if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
                return new vscode_1.NotebookCellOutputItem(Buffer.from(value, 'base64'), mime);
            }
            else {
                const data = Uint8Array.from(atob(value), c => c.charCodeAt(0));
                return new vscode_1.NotebookCellOutputItem(data, mime);
            }
        }
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return vscode_1.NotebookCellOutputItem.text(JSON.stringify(value), mime);
        }
        else if (mime === 'application/json') {
            return vscode_1.NotebookCellOutputItem.json(value, mime);
        }
        else {
            // For everything else, treat the data as strings (or multi-line strings).
            value = Array.isArray(value) ? concatMultilineString(value) : value;
            return vscode_1.NotebookCellOutputItem.text(value, mime);
        }
    }
    catch (ex) {
        return vscode_1.NotebookCellOutputItem.error(ex);
    }
}
function getNotebookCellMetadata(cell) {
    // We put this only for VSC to display in diff view.
    // Else we don't use this.
    const cellMetadata = {};
    if (cell.cell_type === 'code') {
        if (typeof cell['execution_count'] === 'number') {
            cellMetadata.execution_count = cell['execution_count'];
        }
        else {
            cellMetadata.execution_count = null;
        }
    }
    if (cell['metadata']) {
        cellMetadata['metadata'] = JSON.parse(JSON.stringify(cell['metadata']));
    }
    if ('id' in cell && typeof cell.id === 'string') {
        cellMetadata.id = cell.id;
    }
    if (cell['attachments']) {
        cellMetadata.attachments = JSON.parse(JSON.stringify(cell['attachments']));
    }
    return cellMetadata;
}
function getOutputMetadata(output) {
    // Add on transient data if we have any. This should be removed by our save functions elsewhere.
    const metadata = {
        outputType: output.output_type
    };
    if (output.transient) {
        metadata.transient = output.transient;
    }
    switch (output.output_type) {
        case 'display_data':
        case 'execute_result':
        case 'update_display_data': {
            metadata.executionCount = output.execution_count;
            metadata.metadata = output.metadata ? JSON.parse(JSON.stringify(output.metadata)) : {};
            break;
        }
        default:
            break;
    }
    return metadata;
}
function translateDisplayDataOutput(output) {
    // Metadata could be as follows:
    // We'll have metadata specific to each mime type as well as generic metadata.
    /*
    IDisplayData = {
        output_type: 'display_data',
        data: {
            'image/jpg': '/////'
            'image/png': '/////'
            'text/plain': '/////'
        },
        metadata: {
            'image/png': '/////',
            'background': true,
            'xyz': '///
        }
    }
    */
    const metadata = getOutputMetadata(output);
    const items = [];
    if (output.data) {
        for (const key in output.data) {
            items.push(convertJupyterOutputToBuffer(key, output.data[key]));
        }
    }
    return new vscode_1.NotebookCellOutput(sortOutputItemsBasedOnDisplayOrder(items), metadata);
}
function translateErrorOutput(output) {
    output = output || { output_type: 'error', ename: '', evalue: '', traceback: [] };
    return new vscode_1.NotebookCellOutput([
        vscode_1.NotebookCellOutputItem.error({
            name: output?.ename || '',
            message: output?.evalue || '',
            stack: (output?.traceback || []).join('\n')
        })
    ], { ...getOutputMetadata(output), originalError: output });
}
function translateStreamOutput(output) {
    const value = concatMultilineString(output.text);
    const item = output.name === 'stderr' ? vscode_1.NotebookCellOutputItem.stderr(value) : vscode_1.NotebookCellOutputItem.stdout(value);
    return new vscode_1.NotebookCellOutput([item], getOutputMetadata(output));
}
const cellOutputMappers = new Map();
cellOutputMappers.set('display_data', translateDisplayDataOutput);
cellOutputMappers.set('execute_result', translateDisplayDataOutput);
cellOutputMappers.set('update_display_data', translateDisplayDataOutput);
cellOutputMappers.set('error', translateErrorOutput);
cellOutputMappers.set('stream', translateStreamOutput);
function jupyterCellOutputToCellOutput(output) {
    /**
     * Stream, `application/x.notebook.stream`
     * Error, `application/x.notebook.error-traceback`
     * Rich, { mime: value }
     *
     * outputs: [
            new vscode.NotebookCellOutput([
                new vscode.NotebookCellOutputItem('application/x.notebook.stream', 2),
                new vscode.NotebookCellOutputItem('application/x.notebook.stream', 3),
            ]),
            new vscode.NotebookCellOutput([
                new vscode.NotebookCellOutputItem('text/markdown', '## header 2'),
                new vscode.NotebookCellOutputItem('image/svg+xml', [
                    "<svg baseProfile=\"full\" height=\"200\" version=\"1.1\" width=\"300\" xmlns=\"http://www.w3.org/2000/svg\">\n",
                    "  <rect fill=\"blue\" height=\"100%\" width=\"100%\"/>\n",
                    "  <circle cx=\"150\" cy=\"100\" fill=\"green\" r=\"80\"/>\n",
                    "  <text fill=\"white\" font-size=\"60\" text-anchor=\"middle\" x=\"150\" y=\"125\">SVG</text>\n",
                    "</svg>"
                    ]),
            ]),
        ]
     *
     */
    const fn = cellOutputMappers.get(output.output_type);
    let result;
    if (fn) {
        result = fn(output);
    }
    else {
        result = translateDisplayDataOutput(output);
    }
    return result;
}
exports.jupyterCellOutputToCellOutput = jupyterCellOutputToCellOutput;
function createNotebookCellDataFromRawCell(cell) {
    const cellData = new vscode_1.NotebookCellData(vscode_1.NotebookCellKind.Code, concatMultilineCellSource(cell.source), 'raw');
    cellData.outputs = [];
    cellData.metadata = getNotebookCellMetadata(cell);
    return cellData;
}
function createNotebookCellDataFromMarkdownCell(cell) {
    const cellData = new vscode_1.NotebookCellData(vscode_1.NotebookCellKind.Markup, concatMultilineCellSource(cell.source), 'markdown');
    cellData.outputs = [];
    cellData.metadata = getNotebookCellMetadata(cell);
    return cellData;
}
function createNotebookCellDataFromCodeCell(cell, cellLanguage) {
    const cellOutputs = Array.isArray(cell.outputs) ? cell.outputs : [];
    const outputs = cellOutputs.map(jupyterCellOutputToCellOutput);
    const hasExecutionCount = typeof cell.execution_count === 'number' && cell.execution_count > 0;
    const source = concatMultilineCellSource(cell.source);
    const executionSummary = hasExecutionCount
        ? { executionOrder: cell.execution_count }
        : {};
    const vscodeCustomMetadata = cell.metadata['vscode'];
    const cellLanguageId = vscodeCustomMetadata && vscodeCustomMetadata.languageId && typeof vscodeCustomMetadata.languageId === 'string' ? vscodeCustomMetadata.languageId : cellLanguage;
    const cellData = new vscode_1.NotebookCellData(vscode_1.NotebookCellKind.Code, source, cellLanguageId);
    cellData.outputs = outputs;
    cellData.metadata = getNotebookCellMetadata(cell);
    cellData.executionSummary = executionSummary;
    return cellData;
}
function createNotebookCellDataFromJupyterCell(cellLanguage, cell) {
    switch (cell.cell_type) {
        case 'raw': {
            return createNotebookCellDataFromRawCell(cell);
        }
        case 'markdown': {
            return createNotebookCellDataFromMarkdownCell(cell);
        }
        case 'code': {
            return createNotebookCellDataFromCodeCell(cell, cellLanguage);
        }
    }
    return;
}
/**
 * Converts a NotebookModel into VS Code format.
 */
function jupyterNotebookModelToNotebookData(notebookContent, preferredLanguage) {
    const notebookContentWithoutCells = { ...notebookContent, cells: [] };
    if (!Array.isArray(notebookContent.cells)) {
        throw new Error('Notebook content is missing cells');
    }
    const cells = notebookContent.cells
        .map(cell => createNotebookCellDataFromJupyterCell(preferredLanguage, cell))
        .filter((item) => !!item);
    const notebookData = new vscode_1.NotebookData(cells);
    notebookData.metadata = notebookContentWithoutCells;
    return notebookData;
}
exports.jupyterNotebookModelToNotebookData = jupyterNotebookModelToNotebookData;
//# sourceMappingURL=deserializers.js.map