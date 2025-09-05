import * as vscode from 'vscode';
import WebSocket from 'ws';

let ws: WebSocket | null = null;

function getBaseUrl(): string {
  const cfg = vscode.workspace.getConfiguration('sis');
  return cfg.get<string>('baseUrl', 'http://localhost:8000');
}

export function activate(context: vscode.ExtensionContext) {
  const out = vscode.window.createOutputChannel('SIS');

  const connectCmd = vscode.commands.registerCommand('sis.connect', async () => {
    try {
      const base = getBaseUrl();
      const wsUrl = base.replace(/^http/, 'ws') + '/ws';
      if (ws) { try { ws.close(); } catch { /* ignore */ } ws = null; }
      ws = new WebSocket(wsUrl);

      ws.on('open', () => out.appendLine(`Connected: ${wsUrl}`));
      ws.on('message', (data) => out.appendLine(`SIS: ${data.toString()}`));
      ws.on('close', () => out.appendLine('WebSocket closed'));
      ws.on('error', (err) => out.appendLine(`WebSocket error: ${String(err)}`));
    } catch (e) {
      out.appendLine(`Connect error: ${String(e)}`);
    }
  });

  const nudgeCmd = vscode.commands.registerCommand('sis.nudge', async () => {
    const base = getBaseUrl();
    const message = await vscode.window.showInputBox({ prompt: 'Message to SIS' });
    if (!message) return;
    try {
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(message);
        out.appendLine('Sent via WS');
        return;
      }
      const res = await fetch(`${base}/cognition/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, symbol: 'BTC/USD' })
      });
      const text = await res.text();
      out.appendLine(`Nudge response: ${text}`);
    } catch (e) {
      out.appendLine(`Nudge error: ${String(e)}`);
    }
  });

  context.subscriptions.push(connectCmd, nudgeCmd, out);
}

export function deactivate() {
  if (ws) { try { ws.close(); } catch { /* ignore */ } ws = null; }
}
