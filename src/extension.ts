import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('voiceChat.start', () => {
        const panel = vscode.window.createWebviewPanel(
            'voiceChatOmni',
            'Omni',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
            }
        );

        const htmlPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'chat.html'));
        panel.webview.html = getWebviewContent(htmlPath);
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(htmlPath: vscode.Uri): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Omni</title>
            <link rel="stylesheet" href="${htmlPath.with({ scheme: 'vscode-resource' })}">
        </head>
        <body>
            <script src="${htmlPath.with({ scheme: 'vscode-resource' })}"></script>
        </body>
        </html>
    `;
}

export function deactivate() { }
