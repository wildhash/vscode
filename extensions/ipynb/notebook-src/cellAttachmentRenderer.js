"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
async function activate(ctx) {
    const markdownItRenderer = (await ctx.getRenderer('vscode.markdown-it-renderer'));
    if (!markdownItRenderer) {
        throw new Error(`Could not load 'vscode.markdown-it-renderer'`);
    }
    markdownItRenderer.extendMarkdownIt((md) => {
        const original = md.renderer.rules.image;
        md.renderer.rules.image = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            const src = token.attrGet('src');
            const attachments = env.outputItem.metadata?.attachments;
            if (attachments && src && src.startsWith('attachment:')) {
                const imageAttachment = attachments[tryDecodeURIComponent(src.replace('attachment:', ''))];
                if (imageAttachment) {
                    // objEntries will always be length 1, with objEntries[0] holding [0]=mime,[1]=b64
                    // if length = 0, something is wrong with the attachment, mime/b64 weren't copied over
                    const objEntries = Object.entries(imageAttachment);
                    if (objEntries.length) {
                        const [attachmentKey, attachmentVal] = objEntries[0];
                        const b64Markdown = 'data:' + attachmentKey + ';base64,' + attachmentVal;
                        token.attrSet('src', b64Markdown);
                    }
                }
            }
            if (original) {
                return original(tokens, idx, options, env, self);
            }
            else {
                return self.renderToken(tokens, idx, options);
            }
        };
    });
}
exports.activate = activate;
function tryDecodeURIComponent(uri) {
    try {
        return decodeURIComponent(uri);
    }
    catch {
        return uri;
    }
}
//# sourceMappingURL=cellAttachmentRenderer.js.map