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
require("mocha");
const assert = __importStar(require("assert"));
const languageModes_1 = require("../modes/languageModes");
const semanticTokens_1 = require("../modes/semanticTokens");
const nodeFs_1 = require("../node/nodeFs");
async function assertTokens(lines, expected, ranges, message) {
    const document = languageModes_1.TextDocument.create('test://foo/bar.html', 'html', 1, lines.join('\n'));
    const workspace = {
        settings: {},
        folders: [{ name: 'foo', uri: 'test://foo' }]
    };
    const languageModes = (0, languageModes_1.getLanguageModes)({ css: true, javascript: true }, workspace, languageModes_1.ClientCapabilities.LATEST, (0, nodeFs_1.getNodeFileFS)());
    const semanticTokensProvider = (0, semanticTokens_1.newSemanticTokenProvider)(languageModes);
    const legend = semanticTokensProvider.legend;
    const actual = await semanticTokensProvider.getSemanticTokens(document, ranges);
    const actualRanges = [];
    let lastLine = 0;
    let lastCharacter = 0;
    for (let i = 0; i < actual.length; i += 5) {
        const lineDelta = actual[i], charDelta = actual[i + 1], len = actual[i + 2], typeIdx = actual[i + 3], modSet = actual[i + 4];
        const line = lastLine + lineDelta;
        const character = lineDelta === 0 ? lastCharacter + charDelta : charDelta;
        const tokenClassifiction = [legend.types[typeIdx], ...legend.modifiers.filter((_, i) => modSet & 1 << i)].join('.');
        actualRanges.push(t(line, character, len, tokenClassifiction));
        lastLine = line;
        lastCharacter = character;
    }
    assert.deepStrictEqual(actualRanges, expected, message);
}
function t(startLine, character, length, tokenClassifiction) {
    return { startLine, character, length, tokenClassifiction };
}
suite('HTML Semantic Tokens', () => {
    test('Variables', async () => {
        const input = [
            /*0*/ '<html>',
            /*1*/ '<head>',
            /*2*/ '<script>',
            /*3*/ '  var x = 9, y1 = [x];',
            /*4*/ '  try {',
            /*5*/ '    for (const s of y1) { x = s }',
            /*6*/ '  } catch (e) {',
            /*7*/ '    throw y1;',
            /*8*/ '  }',
            /*9*/ '</script>',
            /*10*/ '</head>',
            /*11*/ '</html>',
        ];
        await assertTokens(input, [
            t(3, 6, 1, 'variable.declaration'), t(3, 13, 2, 'variable.declaration'), t(3, 19, 1, 'variable'),
            t(5, 15, 1, 'variable.declaration.readonly.local'), t(5, 20, 2, 'variable'), t(5, 26, 1, 'variable'), t(5, 30, 1, 'variable.readonly.local'),
            t(6, 11, 1, 'variable.declaration.local'),
            t(7, 10, 2, 'variable')
        ]);
    });
    test('Functions', async () => {
        const input = [
            /*0*/ '<html>',
            /*1*/ '<head>',
            /*2*/ '<script>',
            /*3*/ '  function foo(p1) {',
            /*4*/ '    return foo(Math.abs(p1))',
            /*5*/ '  }',
            /*6*/ '  `/${window.location}`.split("/").forEach(s => foo(s));',
            /*7*/ '</script>',
            /*8*/ '</head>',
            /*9*/ '</html>',
        ];
        await assertTokens(input, [
            t(3, 11, 3, 'function.declaration'), t(3, 15, 2, 'parameter.declaration'),
            t(4, 11, 3, 'function'), t(4, 15, 4, 'variable.defaultLibrary'), t(4, 20, 3, 'method.defaultLibrary'), t(4, 24, 2, 'parameter'),
            t(6, 6, 6, 'variable.defaultLibrary'), t(6, 13, 8, 'property.defaultLibrary'), t(6, 24, 5, 'method.defaultLibrary'), t(6, 35, 7, 'method.defaultLibrary'), t(6, 43, 1, 'parameter.declaration'), t(6, 48, 3, 'function'), t(6, 52, 1, 'parameter')
        ]);
    });
    test('Members', async () => {
        const input = [
            /*0*/ '<html>',
            /*1*/ '<head>',
            /*2*/ '<script>',
            /*3*/ '  class A {',
            /*4*/ '    static x = 9;',
            /*5*/ '    f = 9;',
            /*6*/ '    async m() { return A.x + await this.m(); };',
            /*7*/ '    get s() { return this.f; ',
            /*8*/ '    static t() { return new A().f; };',
            /*9*/ '    constructor() {}',
            /*10*/ '  }',
            /*11*/ '</script>',
            /*12*/ '</head>',
            /*13*/ '</html>',
        ];
        await assertTokens(input, [
            t(3, 8, 1, 'class.declaration'),
            t(4, 11, 1, 'property.declaration.static'),
            t(5, 4, 1, 'property.declaration'),
            t(6, 10, 1, 'method.declaration.async'), t(6, 23, 1, 'class'), t(6, 25, 1, 'property.static'), t(6, 40, 1, 'method.async'),
            t(7, 8, 1, 'property.declaration'), t(7, 26, 1, 'property'),
            t(8, 11, 1, 'method.declaration.static'), t(8, 28, 1, 'class'), t(8, 32, 1, 'property'),
        ]);
    });
    test('Interfaces', async () => {
        const input = [
            /*0*/ '<html>',
            /*1*/ '<head>',
            /*2*/ '<script type="text/typescript">',
            /*3*/ '  interface Position { x: number, y: number };',
            /*4*/ '  const p = { x: 1, y: 2 } as Position;',
            /*5*/ '  const foo = (o: Position) => o.x + o.y;',
            /*6*/ '</script>',
            /*7*/ '</head>',
            /*8*/ '</html>',
        ];
        await assertTokens(input, [
            t(3, 12, 8, 'interface.declaration'), t(3, 23, 1, 'property.declaration'), t(3, 34, 1, 'property.declaration'),
            t(4, 8, 1, 'variable.declaration.readonly'), t(4, 14, 1, 'property.declaration'), t(4, 20, 1, 'property.declaration'), t(4, 30, 8, 'interface'),
            t(5, 8, 3, 'function.declaration.readonly'), t(5, 15, 1, 'parameter.declaration'), t(5, 18, 8, 'interface'), t(5, 31, 1, 'parameter'), t(5, 33, 1, 'property'), t(5, 37, 1, 'parameter'), t(5, 39, 1, 'property')
        ]);
    });
    test('Readonly', async () => {
        const input = [
            /*0*/ '<html>',
            /*1*/ '<head>',
            /*2*/ '<script type="text/typescript">',
            /*3*/ '  const f = 9;',
            /*4*/ '  class A { static readonly t = 9; static url: URL; }',
            /*5*/ '  const enum E { A = 9, B = A + 1 }',
            /*6*/ '  console.log(f + A.t + A.url.origin);',
            /*7*/ '</script>',
            /*8*/ '</head>',
            /*9*/ '</html>',
        ];
        await assertTokens(input, [
            t(3, 8, 1, 'variable.declaration.readonly'),
            t(4, 8, 1, 'class.declaration'), t(4, 28, 1, 'property.declaration.static.readonly'), t(4, 42, 3, 'property.declaration.static'), t(4, 47, 3, 'interface.defaultLibrary'),
            t(5, 13, 1, 'enum.declaration'), t(5, 17, 1, 'enumMember.declaration.readonly'), t(5, 24, 1, 'enumMember.declaration.readonly'), t(5, 28, 1, 'enumMember.readonly'),
            t(6, 2, 7, 'variable.defaultLibrary'), t(6, 10, 3, 'method.defaultLibrary'), t(6, 14, 1, 'variable.readonly'), t(6, 18, 1, 'class'), t(6, 20, 1, 'property.static.readonly'), t(6, 24, 1, 'class'), t(6, 26, 3, 'property.static'), t(6, 30, 6, 'property.readonly.defaultLibrary'),
        ]);
    });
    test('Type aliases and type parameters', async () => {
        const input = [
            /*0*/ '<html>',
            /*1*/ '<head>',
            /*2*/ '<script type="text/typescript">',
            /*3*/ '  type MyMap = Map<string, number>;',
            /*4*/ '  function f<T extends MyMap>(t: T | number) : T { ',
            /*5*/ '    return <T> <unknown> new Map<string, MyMap>();',
            /*6*/ '  }',
            /*7*/ '</script>',
            /*8*/ '</head>',
            /*9*/ '</html>',
        ];
        await assertTokens(input, [
            t(3, 7, 5, 'type.declaration'), t(3, 15, 3, 'interface.defaultLibrary') /* to investiagte */,
            t(4, 11, 1, 'function.declaration'), t(4, 13, 1, 'typeParameter.declaration'), t(4, 23, 5, 'type'), t(4, 30, 1, 'parameter.declaration'), t(4, 33, 1, 'typeParameter'), t(4, 47, 1, 'typeParameter'),
            t(5, 12, 1, 'typeParameter'), t(5, 29, 3, 'class.defaultLibrary'), t(5, 41, 5, 'type'),
        ]);
    });
    test('TS and JS', async () => {
        const input = [
            /*0*/ '<html>',
            /*1*/ '<head>',
            /*2*/ '<script type="text/typescript">',
            /*3*/ '  function f<T>(p1: T): T[] { return [ p1 ]; }',
            /*4*/ '</script>',
            /*5*/ '<script>',
            /*6*/ '  window.alert("Hello");',
            /*7*/ '</script>',
            /*8*/ '</head>',
            /*9*/ '</html>',
        ];
        await assertTokens(input, [
            t(3, 11, 1, 'function.declaration'), t(3, 13, 1, 'typeParameter.declaration'), t(3, 16, 2, 'parameter.declaration'), t(3, 20, 1, 'typeParameter'), t(3, 24, 1, 'typeParameter'), t(3, 39, 2, 'parameter'),
            t(6, 2, 6, 'variable.defaultLibrary'), t(6, 9, 5, 'method.defaultLibrary')
        ]);
    });
    test('Ranges', async () => {
        const input = [
            /*0*/ '<html>',
            /*1*/ '<head>',
            /*2*/ '<script>',
            /*3*/ '  window.alert("Hello");',
            /*4*/ '</script>',
            /*5*/ '<script>',
            /*6*/ '  window.alert("World");',
            /*7*/ '</script>',
            /*8*/ '</head>',
            /*9*/ '</html>',
        ];
        await assertTokens(input, [
            t(3, 2, 6, 'variable.defaultLibrary'), t(3, 9, 5, 'method.defaultLibrary')
        ], [languageModes_1.Range.create(languageModes_1.Position.create(2, 0), languageModes_1.Position.create(4, 0))]);
        await assertTokens(input, [
            t(6, 2, 6, 'variable.defaultLibrary'),
        ], [languageModes_1.Range.create(languageModes_1.Position.create(6, 2), languageModes_1.Position.create(6, 8))]);
    });
});
//# sourceMappingURL=semanticTokens.test.js.map