"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const node_assert_1 = require("node:assert");
const pathExecutableCache_1 = require("../../env/pathExecutableCache");
suite('PathExecutableCache', () => {
    test('cache should return empty for empty PATH', async () => {
        const cache = new pathExecutableCache_1.PathExecutableCache();
        const result = await cache.getExecutablesInPath({ PATH: '' });
        (0, node_assert_1.strictEqual)(Array.from(result.completionResources).length, 0);
        (0, node_assert_1.strictEqual)(Array.from(result.labels).length, 0);
    });
    test('caching is working on successive calls', async () => {
        const cache = new pathExecutableCache_1.PathExecutableCache();
        const env = { PATH: process.env.PATH };
        const result = await cache.getExecutablesInPath(env);
        const result2 = await cache.getExecutablesInPath(env);
        (0, node_assert_1.strictEqual)(result, result2);
    });
    test('refresh clears the cache', async () => {
        const cache = new pathExecutableCache_1.PathExecutableCache();
        const env = { PATH: process.env.PATH };
        const result = await cache.getExecutablesInPath(env);
        cache.refresh();
        const result2 = await cache.getExecutablesInPath(env);
        (0, node_assert_1.strictEqual)(result !== result2, true);
    });
    if (process.platform !== 'win32') {
        test('cache should include executables found via symbolic links', async () => {
            const path = require('path');
            // Always use the source fixture directory to ensure symlinks are present
            const fixtureDir = path.resolve(__dirname.replace(/out[\/].*$/, 'src/test/env'), '../fixtures/symlink-test');
            const env = { PATH: fixtureDir };
            const cache = new pathExecutableCache_1.PathExecutableCache();
            const result = await cache.getExecutablesInPath(env);
            cache.refresh();
            const labels = Array.from(result.labels);
            (0, node_assert_1.strictEqual)(labels.includes('real-executable.sh'), true);
            (0, node_assert_1.strictEqual)(labels.includes('symlink-executable.sh'), true);
            (0, node_assert_1.strictEqual)(result?.completionResources?.size, 2);
            const completionResources = result.completionResources;
            let realDocRaw = undefined;
            let symlinkDocRaw = undefined;
            for (const resource of completionResources) {
                if (resource.label === 'real-executable.sh') {
                    realDocRaw = resource.documentation;
                }
                else if (resource.label === 'symlink-executable.sh') {
                    symlinkDocRaw = resource.documentation;
                }
            }
            const realDoc = typeof realDocRaw === 'string' ? realDocRaw : (realDocRaw && 'value' in realDocRaw ? realDocRaw.value : undefined);
            const symlinkDoc = typeof symlinkDocRaw === 'string' ? symlinkDocRaw : (symlinkDocRaw && 'value' in symlinkDocRaw ? symlinkDocRaw.value : undefined);
            const realPath = path.join(fixtureDir, 'real-executable.sh');
            const symlinkPath = path.join(fixtureDir, 'symlink-executable.sh');
            (0, node_assert_1.strictEqual)(realDoc, realPath);
            (0, node_assert_1.strictEqual)(symlinkDoc, `${symlinkPath} -> ${realPath}`);
        });
    }
});
//# sourceMappingURL=pathExecutableCache.test.js.map