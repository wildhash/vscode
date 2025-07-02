"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsalAuthProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const msal_node_1 = require("@azure/msal-node");
const vscode_1 = require("vscode");
const ms_rest_azure_env_1 = require("@azure/ms-rest-azure-env");
const publicClientCache_1 = require("./publicClientCache");
const scopeData_1 = require("../common/scopeData");
const event_1 = require("../common/event");
const betterSecretStorage_1 = require("../betterSecretStorage");
const flows_1 = require("./flows");
const redirectUri = 'https://vscode.dev/redirect';
const MSA_TID = '9188040d-6c67-4c5b-b112-36a304b66dad';
const MSA_PASSTHRU_TID = 'f8cdef31-a31e-4b4a-93e4-5f571e91255a';
class MsalAuthProvider {
    constructor(_context, _telemetryReporter, _logger, _uriHandler, _publicClientManager, _env = ms_rest_azure_env_1.Environment.AzureCloud) {
        this._context = _context;
        this._telemetryReporter = _telemetryReporter;
        this._logger = _logger;
        this._uriHandler = _uriHandler;
        this._publicClientManager = _publicClientManager;
        this._env = _env;
        this._eventBufferer = new event_1.EventBufferer();
        /**
         * Event to signal a change in authentication sessions for this provider.
         */
        this._onDidChangeSessionsEmitter = new vscode_1.EventEmitter();
        /**
         * Event to signal a change in authentication sessions for this provider.
         *
         * NOTE: This event is handled differently in the Microsoft auth provider than "typical" auth providers. Normally,
         * this event would fire when the provider's sessions change... which are tied to a specific list of scopes. However,
         * since Microsoft identity doesn't care too much about scopes (you can mint a new token from an existing token),
         * we just fire this event whenever the account list changes... so essentially there is one session per account.
         *
         * This is not quite how the API should be used... but this event really is just for signaling that the account list
         * has changed.
         */
        this.onDidChangeSessions = this._onDidChangeSessionsEmitter.event;
        this._disposables = _context.subscriptions;
        const accountChangeEvent = this._eventBufferer.wrapEvent(this._publicClientManager.onDidAccountsChange, (last, newEvent) => {
            if (!last) {
                return newEvent;
            }
            const mergedEvent = {
                added: [...(last.added ?? []), ...(newEvent.added ?? [])],
                deleted: [...(last.deleted ?? []), ...(newEvent.deleted ?? [])],
                changed: [...(last.changed ?? []), ...(newEvent.changed ?? [])]
            };
            const dedupedEvent = {
                added: Array.from(new Map(mergedEvent.added.map(item => [item.username, item])).values()),
                deleted: Array.from(new Map(mergedEvent.deleted.map(item => [item.username, item])).values()),
                changed: Array.from(new Map(mergedEvent.changed.map(item => [item.username, item])).values())
            };
            return dedupedEvent;
        }, { added: new Array(), deleted: new Array(), changed: new Array() })(e => this._handleAccountChange(e));
        this._disposables.push(this._onDidChangeSessionsEmitter, accountChangeEvent);
    }
    static async create(context, telemetryReporter, logger, uriHandler, env = ms_rest_azure_env_1.Environment.AzureCloud) {
        const publicClientManager = await publicClientCache_1.CachedPublicClientApplicationManager.create(context.secrets, logger, telemetryReporter, env.name);
        context.subscriptions.push(publicClientManager);
        const authProvider = new MsalAuthProvider(context, telemetryReporter, logger, uriHandler, publicClientManager, env);
        await authProvider.initialize();
        return authProvider;
    }
    /**
     * Migrate sessions from the old secret storage to MSAL.
     * TODO: MSAL Migration. Remove this when we remove the old flow.
     */
    async _migrateSessions() {
        const betterSecretStorage = new betterSecretStorage_1.BetterTokenStorage('microsoft.login.keylist', this._context);
        const sessions = await betterSecretStorage.getAll(item => {
            item.endpoint || (item.endpoint = ms_rest_azure_env_1.Environment.AzureCloud.activeDirectoryEndpointUrl);
            return item.endpoint === this._env.activeDirectoryEndpointUrl;
        });
        this._context.globalState.update('msalMigration', true);
        const clientTenantMap = new Map();
        for (const session of sessions) {
            const scopeData = new scopeData_1.ScopeData(session.scope.split(' '));
            const key = `${scopeData.clientId}:${scopeData.tenant}`;
            if (!clientTenantMap.has(key)) {
                clientTenantMap.set(key, { clientId: scopeData.clientId, tenant: scopeData.tenant, refreshTokens: [] });
            }
            clientTenantMap.get(key).refreshTokens.push(session.refreshToken);
        }
        for (const { clientId, refreshTokens } of clientTenantMap.values()) {
            await this._publicClientManager.getOrCreate(clientId, refreshTokens);
        }
    }
    async initialize() {
        if (!this._context.globalState.get('msalMigration', false)) {
            await this._migrateSessions();
        }
        // Send telemetry for existing accounts
        for (const cachedPca of this._publicClientManager.getAll()) {
            for (const account of cachedPca.accounts) {
                if (!account.idTokenClaims?.tid) {
                    continue;
                }
                const tid = account.idTokenClaims.tid;
                const type = tid === MSA_TID || tid === MSA_PASSTHRU_TID ? "msa" /* MicrosoftAccountType.MSA */ : "aad" /* MicrosoftAccountType.AAD */;
                this._telemetryReporter.sendAccountEvent([], type);
            }
        }
    }
    /**
     * See {@link onDidChangeSessions} for more information on how this is used.
     * @param param0 Event that contains the added and removed accounts
     */
    _handleAccountChange({ added, changed, deleted }) {
        this._logger.debug(`[_handleAccountChange] added: ${added.length}, changed: ${changed.length}, deleted: ${deleted.length}`);
        this._onDidChangeSessionsEmitter.fire({
            added: added.map(this.sessionFromAccountInfo),
            changed: changed.map(this.sessionFromAccountInfo),
            removed: deleted.map(this.sessionFromAccountInfo)
        });
    }
    //#region AuthenticationProvider methods
    async getSessions(scopes, options = {}) {
        const askingForAll = scopes === undefined;
        const scopeData = new scopeData_1.ScopeData(scopes, options?.authorizationServer);
        // Do NOT use `scopes` beyond this place in the code. Use `scopeData` instead.
        this._logger.info('[getSessions]', askingForAll ? '[all]' : `[${scopeData.scopeStr}]`, 'starting');
        // This branch only gets called by Core for sign out purposes and initial population of the account menu. Since we are
        // living in a world where a "session" from Core's perspective is an account, we return 1 session per account.
        // See the large comment on `onDidChangeSessions` for more information.
        if (askingForAll) {
            const allSessionsForAccounts = new Map();
            for (const cachedPca of this._publicClientManager.getAll()) {
                for (const account of cachedPca.accounts) {
                    if (allSessionsForAccounts.has(account.homeAccountId)) {
                        continue;
                    }
                    allSessionsForAccounts.set(account.homeAccountId, this.sessionFromAccountInfo(account));
                }
            }
            const allSessions = Array.from(allSessionsForAccounts.values());
            this._logger.info('[getSessions] [all]', `returned ${allSessions.length} session(s)`);
            return allSessions;
        }
        const cachedPca = await this._publicClientManager.getOrCreate(scopeData.clientId);
        const sessions = await this.getAllSessionsForPca(cachedPca, scopeData, options?.account);
        this._logger.info(`[getSessions] [${scopeData.scopeStr}] returned ${sessions.length} session(s)`);
        return sessions;
    }
    async createSession(scopes, options) {
        const scopeData = new scopeData_1.ScopeData(scopes, options.authorizationServer);
        // Do NOT use `scopes` beyond this place in the code. Use `scopeData` instead.
        this._logger.info('[createSession]', `[${scopeData.scopeStr}]`, 'starting');
        const cachedPca = await this._publicClientManager.getOrCreate(scopeData.clientId);
        // Used for showing a friendlier message to the user when the explicitly cancel a flow.
        let userCancelled;
        const yes = vscode_1.l10n.t('Yes');
        const no = vscode_1.l10n.t('No');
        const promptToContinue = async (mode) => {
            if (userCancelled === undefined) {
                // We haven't had a failure yet so wait to prompt
                return;
            }
            const message = userCancelled
                ? vscode_1.l10n.t('Having trouble logging in? Would you like to try a different way? ({0})', mode)
                : vscode_1.l10n.t('You have not yet finished authorizing this extension to use your Microsoft Account. Would you like to try a different way? ({0})', mode);
            const result = await vscode_1.window.showWarningMessage(message, yes, no);
            if (result !== yes) {
                throw new vscode_1.CancellationError();
            }
        };
        const isNodeEnvironment = typeof process !== 'undefined' && typeof process?.versions?.node === 'string';
        const flows = (0, flows_1.getMsalFlows)({
            extensionHost: isNodeEnvironment
                ? this._context.extension.extensionKind === vscode_1.ExtensionKind.UI ? 2 /* ExtensionHost.Local */ : 1 /* ExtensionHost.Remote */
                : 0 /* ExtensionHost.WebWorker */,
        });
        const authority = new URL(scopeData.tenant, this._env.activeDirectoryEndpointUrl).toString();
        let lastError;
        for (const flow of flows) {
            if (flow !== flows[0]) {
                try {
                    await promptToContinue(flow.label);
                }
                finally {
                    this._telemetryReporter.sendLoginFailedEvent();
                }
            }
            try {
                const result = await flow.trigger({
                    cachedPca,
                    authority,
                    scopes: scopeData.scopesToSend,
                    loginHint: options.account?.label,
                    windowHandle: vscode_1.window.nativeHandle ? Buffer.from(vscode_1.window.nativeHandle) : undefined,
                    logger: this._logger,
                    uriHandler: this._uriHandler
                });
                const session = this.sessionFromAuthenticationResult(result, scopeData.originalScopes);
                this._telemetryReporter.sendLoginEvent(session.scopes);
                this._logger.info('[createSession]', `[${scopeData.scopeStr}]`, 'returned session');
                return session;
            }
            catch (e) {
                lastError = e;
                if (e instanceof msal_node_1.ServerError || e?.errorCode === msal_node_1.ClientAuthErrorCodes.userCanceled) {
                    this._telemetryReporter.sendLoginFailedEvent();
                    throw e;
                }
                // Continue to next flow
                if (e instanceof vscode_1.CancellationError) {
                    userCancelled = true;
                }
            }
        }
        this._telemetryReporter.sendLoginFailedEvent();
        throw lastError ?? new Error('No auth flow succeeded');
    }
    async removeSession(sessionId) {
        this._logger.info('[removeSession]', sessionId, 'starting');
        const promises = new Array();
        for (const cachedPca of this._publicClientManager.getAll()) {
            const accounts = cachedPca.accounts;
            for (const account of accounts) {
                if (account.homeAccountId === sessionId) {
                    this._telemetryReporter.sendLogoutEvent();
                    promises.push(cachedPca.removeAccount(account));
                    this._logger.info(`[removeSession] [${sessionId}] [${cachedPca.clientId}] removing session...`);
                }
            }
        }
        if (!promises.length) {
            this._logger.info('[removeSession]', sessionId, 'session not found');
            return;
        }
        const results = await Promise.allSettled(promises);
        for (const result of results) {
            if (result.status === 'rejected') {
                this._telemetryReporter.sendLogoutFailedEvent();
                this._logger.error('[removeSession]', sessionId, 'error removing session', result.reason);
            }
        }
        this._logger.info('[removeSession]', sessionId, `attempted to remove ${promises.length} sessions`);
    }
    //#endregion
    async getAllSessionsForPca(cachedPca, scopeData, accountFilter) {
        let filteredAccounts = accountFilter
            ? cachedPca.accounts.filter(a => a.homeAccountId === accountFilter.id)
            : cachedPca.accounts;
        // Group accounts by homeAccountId
        const accountGroups = new Map();
        for (const account of filteredAccounts) {
            const existing = accountGroups.get(account.homeAccountId) || [];
            existing.push(account);
            accountGroups.set(account.homeAccountId, existing);
        }
        // Filter to one account per homeAccountId
        filteredAccounts = Array.from(accountGroups.values()).map(accounts => {
            if (accounts.length === 1) {
                return accounts[0];
            }
            // If we have a specific tenant to target, prefer that one
            if (scopeData.tenantId) {
                const matchingTenant = accounts.find(a => a.tenantId === scopeData.tenantId);
                if (matchingTenant) {
                    return matchingTenant;
                }
            }
            // Otherwise prefer the home tenant
            return accounts.find(a => a.tenantId === a.idTokenClaims?.tid) || accounts[0];
        });
        const authority = new URL(scopeData.tenant, this._env.activeDirectoryEndpointUrl).toString();
        const sessions = [];
        return this._eventBufferer.bufferEventsAsync(async () => {
            for (const account of filteredAccounts) {
                try {
                    let forceRefresh;
                    if (scopeData.tenantId) {
                        // If the tenants do not match, then we need to skip the cache
                        // to get a new token for the new tenant
                        if (account.tenantId !== scopeData.tenantId) {
                            forceRefresh = true;
                        }
                    }
                    else {
                        // If we are requesting the home tenant and we don't yet have
                        // a token for the home tenant, we need to skip the cache
                        // to get a new token for the home tenant
                        if (account.tenantId !== account.idTokenClaims?.tid) {
                            forceRefresh = true;
                        }
                    }
                    const result = await cachedPca.acquireTokenSilent({
                        account,
                        authority,
                        scopes: scopeData.scopesToSend,
                        redirectUri,
                        forceRefresh
                    });
                    sessions.push(this.sessionFromAuthenticationResult(result, scopeData.originalScopes));
                }
                catch (e) {
                    // If we can't get a token silently, the account is probably in a bad state so we should skip it
                    // MSAL will log this already, so we don't need to log it again
                    this._telemetryReporter.sendTelemetryErrorEvent(e);
                    continue;
                }
            }
            return sessions;
        });
    }
    sessionFromAuthenticationResult(result, scopes) {
        return {
            accessToken: result.accessToken,
            idToken: result.idToken,
            id: result.account?.homeAccountId ?? result.uniqueId,
            account: {
                id: result.account?.homeAccountId ?? result.uniqueId,
                label: result.account?.username.toLowerCase() ?? 'Unknown',
            },
            scopes
        };
    }
    sessionFromAccountInfo(account) {
        return {
            accessToken: '1234',
            id: account.homeAccountId,
            scopes: [],
            account: {
                id: account.homeAccountId,
                label: account.username.toLowerCase(),
            },
            idToken: account.idToken,
        };
    }
}
exports.MsalAuthProvider = MsalAuthProvider;
//# sourceMappingURL=authProvider.js.map