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
const git_1 = require("../git");
const assert = __importStar(require("assert"));
const util_1 = require("../util");
suite('git', () => {
    suite('GitStatusParser', () => {
        test('empty parser', () => {
            const parser = new git_1.GitStatusParser();
            assert.deepStrictEqual(parser.status, []);
        });
        test('empty parser 2', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('');
            assert.deepStrictEqual(parser.status, []);
        });
        test('simple', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('?? file.txt\0');
            assert.deepStrictEqual(parser.status, [
                { path: 'file.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
        test('simple 2', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('?? file.txt\0');
            parser.update('?? file2.txt\0');
            parser.update('?? file3.txt\0');
            assert.deepStrictEqual(parser.status, [
                { path: 'file.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file2.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file3.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
        test('empty lines', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('');
            parser.update('?? file.txt\0');
            parser.update('');
            parser.update('');
            parser.update('?? file2.txt\0');
            parser.update('');
            parser.update('?? file3.txt\0');
            parser.update('');
            assert.deepStrictEqual(parser.status, [
                { path: 'file.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file2.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file3.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
        test('combined', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('?? file.txt\0?? file2.txt\0?? file3.txt\0');
            assert.deepStrictEqual(parser.status, [
                { path: 'file.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file2.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file3.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
        test('split 1', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('?? file.txt\0?? file2');
            parser.update('.txt\0?? file3.txt\0');
            assert.deepStrictEqual(parser.status, [
                { path: 'file.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file2.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file3.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
        test('split 2', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('?? file.txt');
            parser.update('\0?? file2.txt\0?? file3.txt\0');
            assert.deepStrictEqual(parser.status, [
                { path: 'file.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file2.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file3.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
        test('split 3', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('?? file.txt\0?? file2.txt\0?? file3.txt');
            parser.update('\0');
            assert.deepStrictEqual(parser.status, [
                { path: 'file.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file2.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file3.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
        test('rename', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('R  newfile.txt\0file.txt\0?? file2.txt\0?? file3.txt\0');
            assert.deepStrictEqual(parser.status, [
                { path: 'file.txt', rename: 'newfile.txt', x: 'R', y: ' ' },
                { path: 'file2.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file3.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
        test('rename split', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('R  newfile.txt\0fil');
            parser.update('e.txt\0?? file2.txt\0?? file3.txt\0');
            assert.deepStrictEqual(parser.status, [
                { path: 'file.txt', rename: 'newfile.txt', x: 'R', y: ' ' },
                { path: 'file2.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file3.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
        test('rename split 3', () => {
            const parser = new git_1.GitStatusParser();
            parser.update('?? file2.txt\0R  new');
            parser.update('file.txt\0fil');
            parser.update('e.txt\0?? file3.txt\0');
            assert.deepStrictEqual(parser.status, [
                { path: 'file2.txt', rename: undefined, x: '?', y: '?' },
                { path: 'file.txt', rename: 'newfile.txt', x: 'R', y: ' ' },
                { path: 'file3.txt', rename: undefined, x: '?', y: '?' }
            ]);
        });
    });
    suite('parseGitmodules', () => {
        test('empty', () => {
            assert.deepStrictEqual((0, git_1.parseGitmodules)(''), []);
        });
        test('sample', () => {
            const sample = `[submodule "deps/spdlog"]
	path = deps/spdlog
	url = https://github.com/gabime/spdlog.git
`;
            assert.deepStrictEqual((0, git_1.parseGitmodules)(sample), [
                { name: 'deps/spdlog', path: 'deps/spdlog', url: 'https://github.com/gabime/spdlog.git' }
            ]);
        });
        test('big', () => {
            const sample = `[submodule "deps/spdlog"]
	path = deps/spdlog
	url = https://github.com/gabime/spdlog.git
[submodule "deps/spdlog2"]
	path = deps/spdlog2
	url = https://github.com/gabime/spdlog.git
[submodule "deps/spdlog3"]
	path = deps/spdlog3
	url = https://github.com/gabime/spdlog.git
[submodule "deps/spdlog4"]
	path = deps/spdlog4
	url = https://github.com/gabime/spdlog4.git
`;
            assert.deepStrictEqual((0, git_1.parseGitmodules)(sample), [
                { name: 'deps/spdlog', path: 'deps/spdlog', url: 'https://github.com/gabime/spdlog.git' },
                { name: 'deps/spdlog2', path: 'deps/spdlog2', url: 'https://github.com/gabime/spdlog.git' },
                { name: 'deps/spdlog3', path: 'deps/spdlog3', url: 'https://github.com/gabime/spdlog.git' },
                { name: 'deps/spdlog4', path: 'deps/spdlog4', url: 'https://github.com/gabime/spdlog4.git' }
            ]);
        });
        test('whitespace #74844', () => {
            const sample = `[submodule "deps/spdlog"]
	path = deps/spdlog
	url  = https://github.com/gabime/spdlog.git
`;
            assert.deepStrictEqual((0, git_1.parseGitmodules)(sample), [
                { name: 'deps/spdlog', path: 'deps/spdlog', url: 'https://github.com/gabime/spdlog.git' }
            ]);
        });
        test('whitespace again #108371', () => {
            const sample = `[submodule "deps/spdlog"]
	path= deps/spdlog
	url=https://github.com/gabime/spdlog.git
`;
            assert.deepStrictEqual((0, git_1.parseGitmodules)(sample), [
                { name: 'deps/spdlog', path: 'deps/spdlog', url: 'https://github.com/gabime/spdlog.git' }
            ]);
        });
    });
    suite('parseGitRemotes', () => {
        test('empty', () => {
            assert.deepStrictEqual((0, git_1.parseGitRemotes)(''), []);
        });
        test('single remote', () => {
            const sample = `[remote "origin"]
	url = https://github.com/microsoft/vscode.git
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
            assert.deepStrictEqual((0, git_1.parseGitRemotes)(sample), [
                { name: 'origin', fetchUrl: 'https://github.com/microsoft/vscode.git', pushUrl: 'https://github.com/microsoft/vscode.git', isReadOnly: false }
            ]);
        });
        test('single remote (multiple urls)', () => {
            const sample = `[remote "origin"]
	url = https://github.com/microsoft/vscode.git
	url = https://github.com/microsoft/vscode2.git
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
            assert.deepStrictEqual((0, git_1.parseGitRemotes)(sample), [
                { name: 'origin', fetchUrl: 'https://github.com/microsoft/vscode.git', pushUrl: 'https://github.com/microsoft/vscode.git', isReadOnly: false }
            ]);
        });
        test('multiple remotes', () => {
            const sample = `[remote "origin"]
	url = https://github.com/microsoft/vscode.git
	pushurl = https://github.com/microsoft/vscode1.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[remote "remote2"]
	url = https://github.com/microsoft/vscode2.git
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
            assert.deepStrictEqual((0, git_1.parseGitRemotes)(sample), [
                { name: 'origin', fetchUrl: 'https://github.com/microsoft/vscode.git', pushUrl: 'https://github.com/microsoft/vscode1.git', isReadOnly: false },
                { name: 'remote2', fetchUrl: 'https://github.com/microsoft/vscode2.git', pushUrl: 'https://github.com/microsoft/vscode2.git', isReadOnly: false }
            ]);
        });
        test('remotes (white space)', () => {
            const sample = ` [remote "origin"]
	url  =  https://github.com/microsoft/vscode.git
	pushurl=https://github.com/microsoft/vscode1.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[ remote"remote2"]
	url = https://github.com/microsoft/vscode2.git
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
            assert.deepStrictEqual((0, git_1.parseGitRemotes)(sample), [
                { name: 'origin', fetchUrl: 'https://github.com/microsoft/vscode.git', pushUrl: 'https://github.com/microsoft/vscode1.git', isReadOnly: false },
                { name: 'remote2', fetchUrl: 'https://github.com/microsoft/vscode2.git', pushUrl: 'https://github.com/microsoft/vscode2.git', isReadOnly: false }
            ]);
        });
        test('remotes (invalid section)', () => {
            const sample = `[remote "origin"
	url = https://github.com/microsoft/vscode.git
	pushurl = https://github.com/microsoft/vscode1.git
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
            assert.deepStrictEqual((0, git_1.parseGitRemotes)(sample), []);
        });
    });
    suite('parseGitCommit', () => {
        test('single parent commit', function () {
            const GIT_OUTPUT_SINGLE_PARENT = '52c293a05038d865604c2284aa8698bd087915a1\n' +
                'John Doe\n' +
                'john.doe@mail.com\n' +
                '1580811030\n' +
                '1580811031\n' +
                '8e5a374372b8393906c7e380dbb09349c5385554\n' +
                'main,branch\n' +
                'This is a commit message.\x00';
            assert.deepStrictEqual((0, git_1.parseGitCommits)(GIT_OUTPUT_SINGLE_PARENT), [{
                    hash: '52c293a05038d865604c2284aa8698bd087915a1',
                    message: 'This is a commit message.',
                    parents: ['8e5a374372b8393906c7e380dbb09349c5385554'],
                    authorDate: new Date(1580811030000),
                    authorName: 'John Doe',
                    authorEmail: 'john.doe@mail.com',
                    commitDate: new Date(1580811031000),
                    refNames: ['main', 'branch'],
                    shortStat: undefined
                }]);
        });
        test('multiple parent commits', function () {
            const GIT_OUTPUT_MULTIPLE_PARENTS = '52c293a05038d865604c2284aa8698bd087915a1\n' +
                'John Doe\n' +
                'john.doe@mail.com\n' +
                '1580811030\n' +
                '1580811031\n' +
                '8e5a374372b8393906c7e380dbb09349c5385554 df27d8c75b129ab9b178b386077da2822101b217\n' +
                'main\n' +
                'This is a commit message.\x00';
            assert.deepStrictEqual((0, git_1.parseGitCommits)(GIT_OUTPUT_MULTIPLE_PARENTS), [{
                    hash: '52c293a05038d865604c2284aa8698bd087915a1',
                    message: 'This is a commit message.',
                    parents: ['8e5a374372b8393906c7e380dbb09349c5385554', 'df27d8c75b129ab9b178b386077da2822101b217'],
                    authorDate: new Date(1580811030000),
                    authorName: 'John Doe',
                    authorEmail: 'john.doe@mail.com',
                    commitDate: new Date(1580811031000),
                    refNames: ['main'],
                    shortStat: undefined
                }]);
        });
        test('no parent commits', function () {
            const GIT_OUTPUT_NO_PARENTS = '52c293a05038d865604c2284aa8698bd087915a1\n' +
                'John Doe\n' +
                'john.doe@mail.com\n' +
                '1580811030\n' +
                '1580811031\n' +
                '\n' +
                'main\n' +
                'This is a commit message.\x00';
            assert.deepStrictEqual((0, git_1.parseGitCommits)(GIT_OUTPUT_NO_PARENTS), [{
                    hash: '52c293a05038d865604c2284aa8698bd087915a1',
                    message: 'This is a commit message.',
                    parents: [],
                    authorDate: new Date(1580811030000),
                    authorName: 'John Doe',
                    authorEmail: 'john.doe@mail.com',
                    commitDate: new Date(1580811031000),
                    refNames: ['main'],
                    shortStat: undefined
                }]);
        });
        test('commit with shortstat', function () {
            const GIT_OUTPUT_SINGLE_PARENT = '52c293a05038d865604c2284aa8698bd087915a1\n' +
                'John Doe\n' +
                'john.doe@mail.com\n' +
                '1580811030\n' +
                '1580811031\n' +
                '8e5a374372b8393906c7e380dbb09349c5385554\n' +
                'main,branch\n' +
                'This is a commit message.\x00\n' +
                ' 1 file changed, 2 insertions(+), 3 deletion(-)';
            assert.deepStrictEqual((0, git_1.parseGitCommits)(GIT_OUTPUT_SINGLE_PARENT), [{
                    hash: '52c293a05038d865604c2284aa8698bd087915a1',
                    message: 'This is a commit message.',
                    parents: ['8e5a374372b8393906c7e380dbb09349c5385554'],
                    authorDate: new Date(1580811030000),
                    authorName: 'John Doe',
                    authorEmail: 'john.doe@mail.com',
                    commitDate: new Date(1580811031000),
                    refNames: ['main', 'branch'],
                    shortStat: {
                        deletions: 3,
                        files: 1,
                        insertions: 2
                    }
                }]);
        });
        test('commit with shortstat (no insertions)', function () {
            const GIT_OUTPUT_SINGLE_PARENT = '52c293a05038d865604c2284aa8698bd087915a1\n' +
                'John Doe\n' +
                'john.doe@mail.com\n' +
                '1580811030\n' +
                '1580811031\n' +
                '8e5a374372b8393906c7e380dbb09349c5385554\n' +
                'main,branch\n' +
                'This is a commit message.\x00\n' +
                ' 1 file changed, 3 deletion(-)';
            assert.deepStrictEqual((0, git_1.parseGitCommits)(GIT_OUTPUT_SINGLE_PARENT), [{
                    hash: '52c293a05038d865604c2284aa8698bd087915a1',
                    message: 'This is a commit message.',
                    parents: ['8e5a374372b8393906c7e380dbb09349c5385554'],
                    authorDate: new Date(1580811030000),
                    authorName: 'John Doe',
                    authorEmail: 'john.doe@mail.com',
                    commitDate: new Date(1580811031000),
                    refNames: ['main', 'branch'],
                    shortStat: {
                        deletions: 3,
                        files: 1,
                        insertions: 0
                    }
                }]);
        });
        test('commit with shortstat (no deletions)', function () {
            const GIT_OUTPUT_SINGLE_PARENT = '52c293a05038d865604c2284aa8698bd087915a1\n' +
                'John Doe\n' +
                'john.doe@mail.com\n' +
                '1580811030\n' +
                '1580811031\n' +
                '8e5a374372b8393906c7e380dbb09349c5385554\n' +
                'main,branch\n' +
                'This is a commit message.\x00\n' +
                ' 1 file changed, 2 insertions(+)';
            assert.deepStrictEqual((0, git_1.parseGitCommits)(GIT_OUTPUT_SINGLE_PARENT), [{
                    hash: '52c293a05038d865604c2284aa8698bd087915a1',
                    message: 'This is a commit message.',
                    parents: ['8e5a374372b8393906c7e380dbb09349c5385554'],
                    authorDate: new Date(1580811030000),
                    authorName: 'John Doe',
                    authorEmail: 'john.doe@mail.com',
                    commitDate: new Date(1580811031000),
                    refNames: ['main', 'branch'],
                    shortStat: {
                        deletions: 0,
                        files: 1,
                        insertions: 2
                    }
                }]);
        });
        test('commit list', function () {
            const GIT_OUTPUT_SINGLE_PARENT = '52c293a05038d865604c2284aa8698bd087915a1\n' +
                'John Doe\n' +
                'john.doe@mail.com\n' +
                '1580811030\n' +
                '1580811031\n' +
                '8e5a374372b8393906c7e380dbb09349c5385554\n' +
                'main,branch\n' +
                'This is a commit message.\x00\n' +
                '52c293a05038d865604c2284aa8698bd087915a2\n' +
                'Jane Doe\n' +
                'jane.doe@mail.com\n' +
                '1580811032\n' +
                '1580811033\n' +
                '8e5a374372b8393906c7e380dbb09349c5385555\n' +
                'main,branch\n' +
                'This is another commit message.\x00';
            assert.deepStrictEqual((0, git_1.parseGitCommits)(GIT_OUTPUT_SINGLE_PARENT), [
                {
                    hash: '52c293a05038d865604c2284aa8698bd087915a1',
                    message: 'This is a commit message.',
                    parents: ['8e5a374372b8393906c7e380dbb09349c5385554'],
                    authorDate: new Date(1580811030000),
                    authorName: 'John Doe',
                    authorEmail: 'john.doe@mail.com',
                    commitDate: new Date(1580811031000),
                    refNames: ['main', 'branch'],
                    shortStat: undefined,
                },
                {
                    hash: '52c293a05038d865604c2284aa8698bd087915a2',
                    message: 'This is another commit message.',
                    parents: ['8e5a374372b8393906c7e380dbb09349c5385555'],
                    authorDate: new Date(1580811032000),
                    authorName: 'Jane Doe',
                    authorEmail: 'jane.doe@mail.com',
                    commitDate: new Date(1580811033000),
                    refNames: ['main', 'branch'],
                    shortStat: undefined,
                },
            ]);
        });
        test('commit list with shortstat', function () {
            const GIT_OUTPUT_SINGLE_PARENT = '52c293a05038d865604c2284aa8698bd087915a1\n' +
                'John Doe\n' +
                'john.doe@mail.com\n' +
                '1580811030\n' +
                '1580811031\n' +
                '8e5a374372b8393906c7e380dbb09349c5385554\n' +
                'main,branch\n' +
                'This is a commit message.\x00\n' +
                ' 5 file changed, 12 insertions(+), 13 deletion(-)\n' +
                '52c293a05038d865604c2284aa8698bd087915a2\n' +
                'Jane Doe\n' +
                'jane.doe@mail.com\n' +
                '1580811032\n' +
                '1580811033\n' +
                '8e5a374372b8393906c7e380dbb09349c5385555\n' +
                'main,branch\n' +
                'This is another commit message.\x00\n' +
                ' 6 file changed, 22 insertions(+), 23 deletion(-)';
            assert.deepStrictEqual((0, git_1.parseGitCommits)(GIT_OUTPUT_SINGLE_PARENT), [{
                    hash: '52c293a05038d865604c2284aa8698bd087915a1',
                    message: 'This is a commit message.',
                    parents: ['8e5a374372b8393906c7e380dbb09349c5385554'],
                    authorDate: new Date(1580811030000),
                    authorName: 'John Doe',
                    authorEmail: 'john.doe@mail.com',
                    commitDate: new Date(1580811031000),
                    refNames: ['main', 'branch'],
                    shortStat: {
                        deletions: 13,
                        files: 5,
                        insertions: 12
                    }
                },
                {
                    hash: '52c293a05038d865604c2284aa8698bd087915a2',
                    message: 'This is another commit message.',
                    parents: ['8e5a374372b8393906c7e380dbb09349c5385555'],
                    authorDate: new Date(1580811032000),
                    authorName: 'Jane Doe',
                    authorEmail: 'jane.doe@mail.com',
                    commitDate: new Date(1580811033000),
                    refNames: ['main', 'branch'],
                    shortStat: {
                        deletions: 23,
                        files: 6,
                        insertions: 22
                    }
                }]);
        });
    });
    suite('parseLsTree', function () {
        test('sample', function () {
            const input = `040000 tree 0274a81f8ee9ca3669295dc40f510bd2021d0043       -	.vscode
100644 blob 1d487c1817262e4f20efbfa1d04c18f51b0046f6  491570	Screen Shot 2018-06-01 at 14.48.05.png
100644 blob 686c16e4f019b734655a2576ce8b98749a9ffdb9  764420	Screen Shot 2018-06-07 at 20.04.59.png
100644 blob 257cc5642cb1a054f08cc83f2d943e56fd3ebe99       4	boom.txt
100644 blob 86dc360dd25f13fa50ffdc8259e9653921f4f2b7      11	boomcaboom.txt
100644 blob a68b14060589b16d7ac75f67b905c918c03c06eb      24	file.js
100644 blob f7bcfb05af46850d780f88c069edcd57481d822d     201	file.md
100644 blob ab8b86114a051f6490f1ec5e3141b9a632fb46b5       8	hello.js
100644 blob 257cc5642cb1a054f08cc83f2d943e56fd3ebe99       4	what.js
100644 blob be859e3f412fa86513cd8bebe8189d1ea1a3e46d      24	what.txt
100644 blob 56ec42c9dc6fcf4534788f0fe34b36e09f37d085  261186	what.txt2`;
            const output = (0, git_1.parseLsTree)(input);
            assert.deepStrictEqual(output, [
                { mode: '040000', type: 'tree', object: '0274a81f8ee9ca3669295dc40f510bd2021d0043', size: '-', file: '.vscode' },
                { mode: '100644', type: 'blob', object: '1d487c1817262e4f20efbfa1d04c18f51b0046f6', size: '491570', file: 'Screen Shot 2018-06-01 at 14.48.05.png' },
                { mode: '100644', type: 'blob', object: '686c16e4f019b734655a2576ce8b98749a9ffdb9', size: '764420', file: 'Screen Shot 2018-06-07 at 20.04.59.png' },
                { mode: '100644', type: 'blob', object: '257cc5642cb1a054f08cc83f2d943e56fd3ebe99', size: '4', file: 'boom.txt' },
                { mode: '100644', type: 'blob', object: '86dc360dd25f13fa50ffdc8259e9653921f4f2b7', size: '11', file: 'boomcaboom.txt' },
                { mode: '100644', type: 'blob', object: 'a68b14060589b16d7ac75f67b905c918c03c06eb', size: '24', file: 'file.js' },
                { mode: '100644', type: 'blob', object: 'f7bcfb05af46850d780f88c069edcd57481d822d', size: '201', file: 'file.md' },
                { mode: '100644', type: 'blob', object: 'ab8b86114a051f6490f1ec5e3141b9a632fb46b5', size: '8', file: 'hello.js' },
                { mode: '100644', type: 'blob', object: '257cc5642cb1a054f08cc83f2d943e56fd3ebe99', size: '4', file: 'what.js' },
                { mode: '100644', type: 'blob', object: 'be859e3f412fa86513cd8bebe8189d1ea1a3e46d', size: '24', file: 'what.txt' },
                { mode: '100644', type: 'blob', object: '56ec42c9dc6fcf4534788f0fe34b36e09f37d085', size: '261186', file: 'what.txt2' }
            ]);
        });
    });
    suite('parseLsFiles', function () {
        test('sample', function () {
            const input = `100644 7a73a41bfdf76d6f793007240d80983a52f15f97 0	.vscode/settings.json
100644 1d487c1817262e4f20efbfa1d04c18f51b0046f6 0	Screen Shot 2018-06-01 at 14.48.05.png
100644 686c16e4f019b734655a2576ce8b98749a9ffdb9 0	Screen Shot 2018-06-07 at 20.04.59.png
100644 257cc5642cb1a054f08cc83f2d943e56fd3ebe99 0	boom.txt
100644 86dc360dd25f13fa50ffdc8259e9653921f4f2b7 0	boomcaboom.txt
100644 a68b14060589b16d7ac75f67b905c918c03c06eb 0	file.js
100644 f7bcfb05af46850d780f88c069edcd57481d822d 0	file.md
100644 ab8b86114a051f6490f1ec5e3141b9a632fb46b5 0	hello.js
100644 257cc5642cb1a054f08cc83f2d943e56fd3ebe99 0	what.js
100644 be859e3f412fa86513cd8bebe8189d1ea1a3e46d 0	what.txt
100644 56ec42c9dc6fcf4534788f0fe34b36e09f37d085 0	what.txt2`;
            const output = (0, git_1.parseLsFiles)(input);
            assert.deepStrictEqual(output, [
                { mode: '100644', object: '7a73a41bfdf76d6f793007240d80983a52f15f97', stage: '0', file: '.vscode/settings.json' },
                { mode: '100644', object: '1d487c1817262e4f20efbfa1d04c18f51b0046f6', stage: '0', file: 'Screen Shot 2018-06-01 at 14.48.05.png' },
                { mode: '100644', object: '686c16e4f019b734655a2576ce8b98749a9ffdb9', stage: '0', file: 'Screen Shot 2018-06-07 at 20.04.59.png' },
                { mode: '100644', object: '257cc5642cb1a054f08cc83f2d943e56fd3ebe99', stage: '0', file: 'boom.txt' },
                { mode: '100644', object: '86dc360dd25f13fa50ffdc8259e9653921f4f2b7', stage: '0', file: 'boomcaboom.txt' },
                { mode: '100644', object: 'a68b14060589b16d7ac75f67b905c918c03c06eb', stage: '0', file: 'file.js' },
                { mode: '100644', object: 'f7bcfb05af46850d780f88c069edcd57481d822d', stage: '0', file: 'file.md' },
                { mode: '100644', object: 'ab8b86114a051f6490f1ec5e3141b9a632fb46b5', stage: '0', file: 'hello.js' },
                { mode: '100644', object: '257cc5642cb1a054f08cc83f2d943e56fd3ebe99', stage: '0', file: 'what.js' },
                { mode: '100644', object: 'be859e3f412fa86513cd8bebe8189d1ea1a3e46d', stage: '0', file: 'what.txt' },
                { mode: '100644', object: '56ec42c9dc6fcf4534788f0fe34b36e09f37d085', stage: '0', file: 'what.txt2' },
            ]);
        });
    });
    suite('splitInChunks', () => {
        test('unit tests', function () {
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['hello', 'there', 'cool', 'stuff'], 6)], [['hello'], ['there'], ['cool'], ['stuff']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['hello', 'there', 'cool', 'stuff'], 10)], [['hello', 'there'], ['cool', 'stuff']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['hello', 'there', 'cool', 'stuff'], 12)], [['hello', 'there'], ['cool', 'stuff']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['hello', 'there', 'cool', 'stuff'], 14)], [['hello', 'there', 'cool'], ['stuff']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['hello', 'there', 'cool', 'stuff'], 2000)], [['hello', 'there', 'cool', 'stuff']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 1)], [['0'], ['01'], ['012'], ['0'], ['01'], ['012'], ['0'], ['01'], ['012']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 2)], [['0'], ['01'], ['012'], ['0'], ['01'], ['012'], ['0'], ['01'], ['012']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 3)], [['0', '01'], ['012'], ['0', '01'], ['012'], ['0', '01'], ['012']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 4)], [['0', '01'], ['012', '0'], ['01'], ['012', '0'], ['01'], ['012']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 5)], [['0', '01'], ['012', '0'], ['01', '012'], ['0', '01'], ['012']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 6)], [['0', '01', '012'], ['0', '01', '012'], ['0', '01', '012']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 7)], [['0', '01', '012', '0'], ['01', '012', '0'], ['01', '012']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 8)], [['0', '01', '012', '0'], ['01', '012', '0', '01'], ['012']]);
            assert.deepStrictEqual([...(0, util_1.splitInChunks)(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 9)], [['0', '01', '012', '0', '01'], ['012', '0', '01', '012']]);
        });
    });
});
//# sourceMappingURL=git.test.js.map