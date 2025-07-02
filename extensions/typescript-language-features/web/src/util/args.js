"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseServerMode = exports.LanguageServiceMode = exports.findArgumentStringArray = exports.findArgument = exports.hasArgument = void 0;
function hasArgument(args, name) {
    return args.indexOf(name) >= 0;
}
exports.hasArgument = hasArgument;
function findArgument(args, name) {
    const index = args.indexOf(name);
    return 0 <= index && index < args.length - 1
        ? args[index + 1]
        : undefined;
}
exports.findArgument = findArgument;
function findArgumentStringArray(args, name) {
    const arg = findArgument(args, name);
    return arg === undefined ? [] : arg.split(',').filter(name => name !== '');
}
exports.findArgumentStringArray = findArgumentStringArray;
/**
 * Copied from `ts.LanguageServiceMode` to avoid direct dependency.
 */
var LanguageServiceMode;
(function (LanguageServiceMode) {
    LanguageServiceMode[LanguageServiceMode["Semantic"] = 0] = "Semantic";
    LanguageServiceMode[LanguageServiceMode["PartialSemantic"] = 1] = "PartialSemantic";
    LanguageServiceMode[LanguageServiceMode["Syntactic"] = 2] = "Syntactic";
})(LanguageServiceMode = exports.LanguageServiceMode || (exports.LanguageServiceMode = {}));
function parseServerMode(args) {
    const mode = findArgument(args, '--serverMode');
    if (!mode) {
        return undefined;
    }
    switch (mode.toLowerCase()) {
        case 'semantic': return LanguageServiceMode.Semantic;
        case 'partialsemantic': return LanguageServiceMode.PartialSemantic;
        case 'syntactic': return LanguageServiceMode.Syntactic;
        default: return mode;
    }
}
exports.parseServerMode = parseServerMode;
//# sourceMappingURL=args.js.map