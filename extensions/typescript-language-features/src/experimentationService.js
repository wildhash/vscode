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
exports.createTasExperimentationService = exports.ExperimentationService = void 0;
const vscode = __importStar(require("vscode"));
const tas = __importStar(require("vscode-tas-client"));
class ExperimentationService {
    constructor(telemetryReporter, id, version, globalState) {
        this._telemetryReporter = telemetryReporter;
        this._experimentationServicePromise = createTasExperimentationService(this._telemetryReporter, id, version, globalState);
    }
    async getTreatmentVariable(name, defaultValue) {
        const experimentationService = await this._experimentationServicePromise;
        try {
            const treatmentVariable = experimentationService.getTreatmentVariableAsync('vscode', name, /*checkCache*/ true);
            return treatmentVariable;
        }
        catch {
            return defaultValue;
        }
    }
}
exports.ExperimentationService = ExperimentationService;
async function createTasExperimentationService(reporter, id, version, globalState) {
    let targetPopulation;
    switch (vscode.env.uriScheme) {
        case 'vscode':
            targetPopulation = tas.TargetPopulation.Public;
            break;
        case 'vscode-insiders':
            targetPopulation = tas.TargetPopulation.Insiders;
            break;
        case 'vscode-exploration':
            targetPopulation = tas.TargetPopulation.Internal;
            break;
        case 'code-oss':
            targetPopulation = tas.TargetPopulation.Team;
            break;
        default:
            targetPopulation = tas.TargetPopulation.Public;
            break;
    }
    const experimentationService = tas.getExperimentationService(id, version, targetPopulation, reporter, globalState);
    await experimentationService.initialFetch;
    return experimentationService;
}
exports.createTasExperimentationService = createTasExperimentationService;
//# sourceMappingURL=experimentationService.js.map