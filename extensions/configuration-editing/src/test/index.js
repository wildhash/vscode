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
const path = __importStar(require("path"));
const testRunner = __importStar(require("../../../../test/integration/electron/testrunner"));
const options = {
    ui: 'tdd',
    color: true,
    timeout: 60000
};
// These integration tests is being run in multiple environments (electron, web, remote)
// so we need to set the suite name based on the environment as the suite name is used
// for the test results file name
let suite = '';
if (process.env.VSCODE_BROWSER) {
    suite = `${process.env.VSCODE_BROWSER} Browser Integration Configuration-Editing Tests`;
}
else if (process.env.REMOTE_VSCODE) {
    suite = 'Remote Integration Configuration-Editing Tests';
}
else {
    suite = 'Integration Configuration-Editing Tests';
}
if (process.env.BUILD_ARTIFACTSTAGINGDIRECTORY) {
    options.reporter = 'mocha-multi-reporters';
    options.reporterOptions = {
        reporterEnabled: 'spec, mocha-junit-reporter',
        mochaJunitReporterReporterOptions: {
            testsuitesTitle: `${suite} ${process.platform}`,
            mochaFile: path.join(process.env.BUILD_ARTIFACTSTAGINGDIRECTORY, `test-results/${process.platform}-${process.arch}-${suite.toLowerCase().replace(/[^\w]/g, '-')}-results.xml`)
        }
    };
}
testRunner.configure(options);
module.exports = testRunner;
//# sourceMappingURL=index.js.map