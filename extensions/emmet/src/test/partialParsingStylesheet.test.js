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
const testUtils_1 = require("./testUtils");
const vscode = __importStar(require("vscode"));
const util_1 = require("../util");
const abbreviationActions_1 = require("../abbreviationActions");
suite('Tests for partial parse of Stylesheets', () => {
    teardown(testUtils_1.closeAllEditors);
    function isValid(doc, range, syntax) {
        const rootNode = (0, util_1.parsePartialStylesheet)(doc, range.end);
        const endOffset = doc.offsetAt(range.end);
        const currentNode = (0, util_1.getFlatNode)(rootNode, endOffset, true);
        return (0, abbreviationActions_1.isValidLocationForEmmetAbbreviation)(doc, rootNode, currentNode, syntax, endOffset, range);
    }
    test('Ignore block comment inside rule', function () {
        const cssContents = `
p {
	margin: p ;
	/*dn: none; p */ p
	p
	p.
} p
`;
        return (0, testUtils_1.withRandomFileEditor)(cssContents, '.css', (_, doc) => {
            const rangesForEmmet = [
                new vscode.Range(3, 18, 3, 19),
                new vscode.Range(4, 1, 4, 2),
                new vscode.Range(5, 1, 5, 3) // p. after block comment
            ];
            const rangesNotEmmet = [
                new vscode.Range(1, 0, 1, 1),
                new vscode.Range(2, 9, 2, 10),
                new vscode.Range(3, 3, 3, 5),
                new vscode.Range(3, 13, 3, 14),
                new vscode.Range(6, 2, 6, 3) // p after ending of block
            ];
            rangesForEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'css'), true);
            });
            rangesNotEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'css'), false);
            });
            return Promise.resolve();
        });
    });
    test('Ignore commented braces', function () {
        const sassContents = `
.foo
// .foo { brs
/* .foo { op.3
dn	{
*/
	bgc
} bg
`;
        return (0, testUtils_1.withRandomFileEditor)(sassContents, '.scss', (_, doc) => {
            const rangesNotEmmet = [
                new vscode.Range(1, 0, 1, 4),
                new vscode.Range(2, 3, 2, 7),
                new vscode.Range(3, 3, 3, 7),
                new vscode.Range(4, 0, 4, 2),
                new vscode.Range(6, 1, 6, 2),
                new vscode.Range(7, 2, 7, 4) // bg after ending of badly constructed block
            ];
            rangesNotEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'scss'), false);
            });
            return Promise.resolve();
        });
    });
    test('Block comment between selector and open brace', function () {
        const cssContents = `
p
/* First line
of a multiline
comment */
{
	margin: p ;
	/*dn: none; p */ p
	p
	p.
} p
`;
        return (0, testUtils_1.withRandomFileEditor)(cssContents, '.css', (_, doc) => {
            const rangesForEmmet = [
                new vscode.Range(7, 18, 7, 19),
                new vscode.Range(8, 1, 8, 2),
                new vscode.Range(9, 1, 9, 3) // p. after block comment
            ];
            const rangesNotEmmet = [
                new vscode.Range(1, 2, 1, 3),
                new vscode.Range(3, 3, 3, 4),
                new vscode.Range(5, 0, 5, 1),
                new vscode.Range(6, 9, 6, 10),
                new vscode.Range(7, 3, 7, 5),
                new vscode.Range(7, 13, 7, 14),
                new vscode.Range(10, 2, 10, 3) // p after ending of block
            ];
            rangesForEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'css'), true);
            });
            rangesNotEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'css'), false);
            });
            return Promise.resolve();
        });
    });
    test('Nested and consecutive rulesets with errors', function () {
        const sassContents = `
.foo{
	a
	a
}}{ p
}
.bar{
	@
	.rudi {
		@
	}
}}}
`;
        return (0, testUtils_1.withRandomFileEditor)(sassContents, '.scss', (_, doc) => {
            const rangesForEmmet = [
                new vscode.Range(2, 1, 2, 2),
                new vscode.Range(3, 1, 3, 2),
                new vscode.Range(7, 1, 7, 2),
                new vscode.Range(9, 2, 9, 3), // @ inside a so far well structured nested ruleset
            ];
            const rangesNotEmmet = [
                new vscode.Range(4, 4, 4, 5),
                new vscode.Range(6, 3, 6, 4) // In selector
            ];
            rangesForEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'scss'), true);
            });
            rangesNotEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'scss'), false);
            });
            return Promise.resolve();
        });
    });
    test('One liner sass', function () {
        const sassContents = `
.foo{dn}.bar{.boo{dn}dn}.comd{/*{dn*/p{div{dn}} }.foo{.other{dn}} dn
`;
        return (0, testUtils_1.withRandomFileEditor)(sassContents, '.scss', (_, doc) => {
            const rangesForEmmet = [
                new vscode.Range(1, 5, 1, 7),
                new vscode.Range(1, 18, 1, 20),
                new vscode.Range(1, 21, 1, 23),
                new vscode.Range(1, 43, 1, 45),
                new vscode.Range(1, 61, 1, 63) // Inside nested ruleset
            ];
            const rangesNotEmmet = [
                new vscode.Range(1, 3, 1, 4),
                new vscode.Range(1, 10, 1, 11),
                new vscode.Range(1, 15, 1, 16),
                new vscode.Range(1, 28, 1, 29),
                new vscode.Range(1, 33, 1, 34),
                new vscode.Range(1, 37, 1, 38),
                new vscode.Range(1, 39, 1, 42),
                new vscode.Range(1, 66, 1, 68) // Outside any ruleset
            ];
            rangesForEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'scss'), true);
            });
            rangesNotEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'scss'), false);
            });
            return Promise.resolve();
        });
    });
    test('Variables and interpolation', function () {
        const sassContents = `
p.#{dn} {
	p.3
	#{$attr}-color: blue;
	dn
} op
.foo{nes{ted}} {
	dn
}
`;
        return (0, testUtils_1.withRandomFileEditor)(sassContents, '.scss', (_, doc) => {
            const rangesForEmmet = [
                new vscode.Range(2, 1, 2, 4),
                new vscode.Range(4, 1, 4, 3) // dn inside ruleset after property with variable
            ];
            const rangesNotEmmet = [
                new vscode.Range(1, 0, 1, 1),
                new vscode.Range(1, 2, 1, 3),
                new vscode.Range(1, 4, 1, 6),
                new vscode.Range(3, 7, 3, 8),
                new vscode.Range(5, 2, 5, 4),
                new vscode.Range(7, 1, 7, 3),
                new vscode.Range(3, 1, 3, 2), // # inside ruleset
            ];
            rangesForEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'scss'), true);
            });
            rangesNotEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'scss'), false);
            });
            return Promise.resolve();
        });
    });
    test('Comments in sass', function () {
        const sassContents = `
.foo{
	/* p // p */ brs6-2p
	dn
}
p
/* c
om
ment */{
	m10
}
.boo{
	op.3
}
`;
        return (0, testUtils_1.withRandomFileEditor)(sassContents, '.scss', (_, doc) => {
            const rangesForEmmet = [
                new vscode.Range(2, 14, 2, 21),
                new vscode.Range(3, 1, 3, 3),
                new vscode.Range(9, 1, 9, 4),
                new vscode.Range(12, 1, 12, 5) // op3 inside a ruleset with commented extra braces
            ];
            const rangesNotEmmet = [
                new vscode.Range(2, 4, 2, 5),
                new vscode.Range(2, 9, 2, 10),
                new vscode.Range(6, 3, 6, 4) // In c inside block comment
            ];
            rangesForEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'scss'), true);
            });
            rangesNotEmmet.forEach(range => {
                assert.strictEqual(isValid(doc, range, 'scss'), false);
            });
            return Promise.resolve();
        });
    });
});
//# sourceMappingURL=partialParsingStylesheet.test.js.map