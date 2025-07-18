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
const sinon = __importStar(require("sinon"));
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const deserializers_1 = require("../deserializers");
const notebookModelStoreSync_1 = require("../notebookModelStoreSync");
suite(`ipynb Clear Outputs`, () => {
    const disposables = [];
    const context = { subscriptions: disposables };
    setup(() => {
        disposables.length = 0;
        (0, notebookModelStoreSync_1.activate)(context);
    });
    teardown(async () => {
        disposables.forEach(d => d.dispose());
        disposables.length = 0;
        sinon.restore();
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
    test.skip('Clear outputs after opening Notebook', async () => {
        const cells = [
            {
                cell_type: 'code',
                execution_count: 10,
                outputs: [{ output_type: 'stream', name: 'stdout', text: ['Hello'] }],
                source: 'print(1)',
                metadata: {}
            },
            {
                cell_type: 'code',
                outputs: [],
                source: 'print(2)',
                metadata: {}
            },
            {
                cell_type: 'markdown',
                source: '# HEAD',
                metadata: {}
            }
        ];
        const notebook = (0, deserializers_1.jupyterNotebookModelToNotebookData)({ cells }, 'python');
        const notebookDocumentPromise = vscode.workspace.openNotebookDocument('jupyter-notebook', notebook);
        await raceTimeout(notebookDocumentPromise, 5000, () => {
            throw new Error('Timeout waiting for notebook to open');
        });
        const notebookDocument = await notebookDocumentPromise;
        await raceTimeout(vscode.window.showNotebookDocument(notebookDocument), 20000, () => {
            throw new Error('Timeout waiting for notebook to open');
        });
        assert.strictEqual(notebookDocument.cellCount, 3);
        assert.strictEqual(notebookDocument.cellAt(0).metadata.execution_count, 10);
        assert.strictEqual(notebookDocument.cellAt(1).metadata.execution_count, null);
        assert.strictEqual(notebookDocument.cellAt(2).metadata.execution_count, undefined);
        // Clear all outputs
        await raceTimeout(vscode.commands.executeCommand('notebook.clearAllCellsOutputs'), 5000, () => {
            throw new Error('Timeout waiting for notebook to clear outputs');
        });
        // Wait for all changes to be applied, could take a few ms.
        const verifyMetadataChanges = () => {
            assert.strictEqual(notebookDocument.cellAt(0).metadata.execution_count, null);
            assert.strictEqual(notebookDocument.cellAt(1).metadata.execution_count, null);
            assert.strictEqual(notebookDocument.cellAt(2).metadata.execution_count, undefined);
        };
        vscode.workspace.onDidChangeNotebookDocument(() => verifyMetadataChanges(), undefined, disposables);
        await new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                try {
                    verifyMetadataChanges();
                    clearInterval(interval);
                    resolve();
                }
                catch {
                    // Ignore
                }
            }, 50);
            disposables.push({ dispose: () => clearInterval(interval) });
            const timeout = setTimeout(() => {
                try {
                    verifyMetadataChanges();
                    resolve();
                }
                catch (ex) {
                    reject(ex);
                }
            }, 1000);
            disposables.push({ dispose: () => clearTimeout(timeout) });
        });
    });
    // test('Serialize', async () => {
    // 	const markdownCell = new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, '# header1', 'markdown');
    // 	markdownCell.metadata = {
    // 		attachments: {
    // 			'image.png': {
    // 				'image/png': 'abc'
    // 			}
    // 		},
    // 		id: '123',
    // 		metadata: {
    // 			foo: 'bar'
    // 		}
    // 	};
    // 	const cellMetadata = getCellMetadata({ cell: markdownCell });
    // 	assert.deepStrictEqual(cellMetadata, {
    // 		id: '123',
    // 		metadata: {
    // 			foo: 'bar',
    // 		},
    // 		attachments: {
    // 			'image.png': {
    // 				'image/png': 'abc'
    // 			}
    // 		}
    // 	});
    // 	const markdownCell2 = new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, '# header1', 'markdown');
    // 	markdownCell2.metadata = {
    // 		id: '123',
    // 		metadata: {
    // 			foo: 'bar'
    // 		},
    // 		attachments: {
    // 			'image.png': {
    // 				'image/png': 'abc'
    // 			}
    // 		}
    // 	};
    // 	const nbMarkdownCell = createMarkdownCellFromNotebookCell(markdownCell);
    // 	const nbMarkdownCell2 = createMarkdownCellFromNotebookCell(markdownCell2);
    // 	assert.deepStrictEqual(nbMarkdownCell, nbMarkdownCell2);
    // 	assert.deepStrictEqual(nbMarkdownCell, {
    // 		cell_type: 'markdown',
    // 		source: ['# header1'],
    // 		metadata: {
    // 			foo: 'bar',
    // 		},
    // 		attachments: {
    // 			'image.png': {
    // 				'image/png': 'abc'
    // 			}
    // 		},
    // 		id: '123'
    // 	});
    // });
    // suite('Outputs', () => {
    // 	function validateCellOutputTranslation(
    // 		outputs: nbformat.IOutput[],
    // 		expectedOutputs: vscode.NotebookCellOutput[],
    // 		propertiesToExcludeFromComparison: string[] = []
    // 	) {
    // 		const cells: nbformat.ICell[] = [
    // 			{
    // 				cell_type: 'code',
    // 				execution_count: 10,
    // 				outputs,
    // 				source: 'print(1)',
    // 				metadata: {}
    // 			}
    // 		];
    // 		const notebook = jupyterNotebookModelToNotebookData({ cells }, 'python');
    // 		// OutputItems contain an `id` property generated by VSC.
    // 		// Exclude that property when comparing.
    // 		const propertiesToExclude = propertiesToExcludeFromComparison.concat(['id']);
    // 		const actualOuts = notebook.cells[0].outputs;
    // 		deepStripProperties(actualOuts, propertiesToExclude);
    // 		deepStripProperties(expectedOutputs, propertiesToExclude);
    // 		assert.deepStrictEqual(actualOuts, expectedOutputs);
    // 	}
    // 	test('Empty output', () => {
    // 		validateCellOutputTranslation([], []);
    // 	});
    // 	test('Stream output', () => {
    // 		validateCellOutputTranslation(
    // 			[
    // 				{
    // 					output_type: 'stream',
    // 					name: 'stderr',
    // 					text: 'Error'
    // 				},
    // 				{
    // 					output_type: 'stream',
    // 					name: 'stdout',
    // 					text: 'NoError'
    // 				}
    // 			],
    // 			[
    // 				new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr('Error')], {
    // 					outputType: 'stream'
    // 				}),
    // 				new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout('NoError')], {
    // 					outputType: 'stream'
    // 				})
    // 			]
    // 		);
    // 	});
    // 	test('Stream output and line endings', () => {
    // 		validateCellOutputTranslation(
    // 			[
    // 				{
    // 					output_type: 'stream',
    // 					name: 'stdout',
    // 					text: [
    // 						'Line1\n',
    // 						'\n',
    // 						'Line3\n',
    // 						'Line4'
    // 					]
    // 				}
    // 			],
    // 			[
    // 				new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout('Line1\n\nLine3\nLine4')], {
    // 					outputType: 'stream'
    // 				})
    // 			]
    // 		);
    // 		validateCellOutputTranslation(
    // 			[
    // 				{
    // 					output_type: 'stream',
    // 					name: 'stdout',
    // 					text: [
    // 						'Hello\n',
    // 						'Hello\n',
    // 						'Hello\n',
    // 						'Hello\n',
    // 						'Hello\n',
    // 						'Hello\n'
    // 					]
    // 				}
    // 			],
    // 			[
    // 				new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout('Hello\nHello\nHello\nHello\nHello\nHello\n')], {
    // 					outputType: 'stream'
    // 				})
    // 			]
    // 		);
    // 	});
    // 	test('Multi-line Stream output', () => {
    // 		validateCellOutputTranslation(
    // 			[
    // 				{
    // 					name: 'stdout',
    // 					output_type: 'stream',
    // 					text: [
    // 						'Epoch 1/5\n',
    // 						'...\n',
    // 						'Epoch 2/5\n',
    // 						'...\n',
    // 						'Epoch 3/5\n',
    // 						'...\n',
    // 						'Epoch 4/5\n',
    // 						'...\n',
    // 						'Epoch 5/5\n',
    // 						'...\n'
    // 					]
    // 				}
    // 			],
    // 			[
    // 				new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout(['Epoch 1/5\n',
    // 					'...\n',
    // 					'Epoch 2/5\n',
    // 					'...\n',
    // 					'Epoch 3/5\n',
    // 					'...\n',
    // 					'Epoch 4/5\n',
    // 					'...\n',
    // 					'Epoch 5/5\n',
    // 					'...\n'].join(''))], {
    // 					outputType: 'stream'
    // 				})
    // 			]
    // 		);
    // 	});
    // 	test('Multi-line Stream output (last empty line should not be saved in ipynb)', () => {
    // 		validateCellOutputTranslation(
    // 			[
    // 				{
    // 					name: 'stderr',
    // 					output_type: 'stream',
    // 					text: [
    // 						'Epoch 1/5\n',
    // 						'...\n',
    // 						'Epoch 2/5\n',
    // 						'...\n',
    // 						'Epoch 3/5\n',
    // 						'...\n',
    // 						'Epoch 4/5\n',
    // 						'...\n',
    // 						'Epoch 5/5\n',
    // 						'...\n'
    // 					]
    // 				}
    // 			],
    // 			[
    // 				new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(['Epoch 1/5\n',
    // 					'...\n',
    // 					'Epoch 2/5\n',
    // 					'...\n',
    // 					'Epoch 3/5\n',
    // 					'...\n',
    // 					'Epoch 4/5\n',
    // 					'...\n',
    // 					'Epoch 5/5\n',
    // 					'...\n',
    // 					// This last empty line should not be saved in ipynb.
    // 					'\n'].join(''))], {
    // 					outputType: 'stream'
    // 				})
    // 			]
    // 		);
    // 	});
    // 	test('Streamed text with Ansi characters', async () => {
    // 		validateCellOutputTranslation(
    // 			[
    // 				{
    // 					name: 'stderr',
    // 					text: '\u001b[K\u001b[33m✅ \u001b[0m Loading\n',
    // 					output_type: 'stream'
    // 				}
    // 			],
    // 			[
    // 				new vscode.NotebookCellOutput(
    // 					[vscode.NotebookCellOutputItem.stderr('\u001b[K\u001b[33m✅ \u001b[0m Loading\n')],
    // 					{
    // 						outputType: 'stream'
    // 					}
    // 				)
    // 			]
    // 		);
    // 	});
    // 	test('Streamed text with angle bracket characters', async () => {
    // 		validateCellOutputTranslation(
    // 			[
    // 				{
    // 					name: 'stderr',
    // 					text: '1 is < 2',
    // 					output_type: 'stream'
    // 				}
    // 			],
    // 			[
    // 				new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr('1 is < 2')], {
    // 					outputType: 'stream'
    // 				})
    // 			]
    // 		);
    // 	});
    // 	test('Streamed text with angle bracket characters and ansi chars', async () => {
    // 		validateCellOutputTranslation(
    // 			[
    // 				{
    // 					name: 'stderr',
    // 					text: '1 is < 2\u001b[K\u001b[33m✅ \u001b[0m Loading\n',
    // 					output_type: 'stream'
    // 				}
    // 			],
    // 			[
    // 				new vscode.NotebookCellOutput(
    // 					[vscode.NotebookCellOutputItem.stderr('1 is < 2\u001b[K\u001b[33m✅ \u001b[0m Loading\n')],
    // 					{
    // 						outputType: 'stream'
    // 					}
    // 				)
    // 			]
    // 		);
    // 	});
    // 	test('Error', async () => {
    // 		validateCellOutputTranslation(
    // 			[
    // 				{
    // 					ename: 'Error Name',
    // 					evalue: 'Error Value',
    // 					traceback: ['stack1', 'stack2', 'stack3'],
    // 					output_type: 'error'
    // 				}
    // 			],
    // 			[
    // 				new vscode.NotebookCellOutput(
    // 					[
    // 						vscode.NotebookCellOutputItem.error({
    // 							name: 'Error Name',
    // 							message: 'Error Value',
    // 							stack: ['stack1', 'stack2', 'stack3'].join('\n')
    // 						})
    // 					],
    // 					{
    // 						outputType: 'error',
    // 						originalError: {
    // 							ename: 'Error Name',
    // 							evalue: 'Error Value',
    // 							traceback: ['stack1', 'stack2', 'stack3'],
    // 							output_type: 'error'
    // 						}
    // 					}
    // 				)
    // 			]
    // 		);
    // 	});
    // 	['display_data', 'execute_result'].forEach(output_type => {
    // 		suite(`Rich output for output_type = ${output_type}`, () => {
    // 			// Properties to exclude when comparing.
    // 			let propertiesToExcludeFromComparison: string[] = [];
    // 			setup(() => {
    // 				if (output_type === 'display_data') {
    // 					// With display_data the execution_count property will never exist in the output.
    // 					// We can ignore that (as it will never exist).
    // 					// But we leave it in the case of `output_type === 'execute_result'`
    // 					propertiesToExcludeFromComparison = ['execution_count', 'executionCount'];
    // 				}
    // 			});
    // 			test('Text mimeType output', async () => {
    // 				validateCellOutputTranslation(
    // 					[
    // 						{
    // 							data: {
    // 								'text/plain': 'Hello World!'
    // 							},
    // 							output_type,
    // 							metadata: {},
    // 							execution_count: 1
    // 						}
    // 					],
    // 					[
    // 						new vscode.NotebookCellOutput(
    // 							[new vscode.NotebookCellOutputItem(Buffer.from('Hello World!', 'utf8'), 'text/plain')],
    // 							{
    // 								outputType: output_type,
    // 								metadata: {}, // display_data & execute_result always have metadata.
    // 								executionCount: 1
    // 							}
    // 						)
    // 					],
    // 					propertiesToExcludeFromComparison
    // 				);
    // 			});
    // 			test('png,jpeg images', async () => {
    // 				validateCellOutputTranslation(
    // 					[
    // 						{
    // 							execution_count: 1,
    // 							data: {
    // 								'image/png': base64EncodedImage,
    // 								'image/jpeg': base64EncodedImage
    // 							},
    // 							metadata: {},
    // 							output_type
    // 						}
    // 					],
    // 					[
    // 						new vscode.NotebookCellOutput(
    // 							[
    // 								new vscode.NotebookCellOutputItem(Buffer.from(base64EncodedImage, 'base64'), 'image/png'),
    // 								new vscode.NotebookCellOutputItem(Buffer.from(base64EncodedImage, 'base64'), 'image/jpeg')
    // 							],
    // 							{
    // 								executionCount: 1,
    // 								outputType: output_type,
    // 								metadata: {} // display_data & execute_result always have metadata.
    // 							}
    // 						)
    // 					],
    // 					propertiesToExcludeFromComparison
    // 				);
    // 			});
    // 			test('png image with a light background', async () => {
    // 				validateCellOutputTranslation(
    // 					[
    // 						{
    // 							execution_count: 1,
    // 							data: {
    // 								'image/png': base64EncodedImage
    // 							},
    // 							metadata: {
    // 								needs_background: 'light'
    // 							},
    // 							output_type
    // 						}
    // 					],
    // 					[
    // 						new vscode.NotebookCellOutput(
    // 							[new vscode.NotebookCellOutputItem(Buffer.from(base64EncodedImage, 'base64'), 'image/png')],
    // 							{
    // 								executionCount: 1,
    // 								metadata: {
    // 									needs_background: 'light'
    // 								},
    // 								outputType: output_type
    // 							}
    // 						)
    // 					],
    // 					propertiesToExcludeFromComparison
    // 				);
    // 			});
    // 			test('png image with a dark background', async () => {
    // 				validateCellOutputTranslation(
    // 					[
    // 						{
    // 							execution_count: 1,
    // 							data: {
    // 								'image/png': base64EncodedImage
    // 							},
    // 							metadata: {
    // 								needs_background: 'dark'
    // 							},
    // 							output_type
    // 						}
    // 					],
    // 					[
    // 						new vscode.NotebookCellOutput(
    // 							[new vscode.NotebookCellOutputItem(Buffer.from(base64EncodedImage, 'base64'), 'image/png')],
    // 							{
    // 								executionCount: 1,
    // 								metadata: {
    // 									needs_background: 'dark'
    // 								},
    // 								outputType: output_type
    // 							}
    // 						)
    // 					],
    // 					propertiesToExcludeFromComparison
    // 				);
    // 			});
    // 			test('png image with custom dimensions', async () => {
    // 				validateCellOutputTranslation(
    // 					[
    // 						{
    // 							execution_count: 1,
    // 							data: {
    // 								'image/png': base64EncodedImage
    // 							},
    // 							metadata: {
    // 								'image/png': { height: '111px', width: '999px' }
    // 							},
    // 							output_type
    // 						}
    // 					],
    // 					[
    // 						new vscode.NotebookCellOutput(
    // 							[new vscode.NotebookCellOutputItem(Buffer.from(base64EncodedImage, 'base64'), 'image/png')],
    // 							{
    // 								executionCount: 1,
    // 								metadata: {
    // 									'image/png': { height: '111px', width: '999px' }
    // 								},
    // 								outputType: output_type
    // 							}
    // 						)
    // 					],
    // 					propertiesToExcludeFromComparison
    // 				);
    // 			});
    // 			test('png allowed to scroll', async () => {
    // 				validateCellOutputTranslation(
    // 					[
    // 						{
    // 							execution_count: 1,
    // 							data: {
    // 								'image/png': base64EncodedImage
    // 							},
    // 							metadata: {
    // 								unconfined: true,
    // 								'image/png': { width: '999px' }
    // 							},
    // 							output_type
    // 						}
    // 					],
    // 					[
    // 						new vscode.NotebookCellOutput(
    // 							[new vscode.NotebookCellOutputItem(Buffer.from(base64EncodedImage, 'base64'), 'image/png')],
    // 							{
    // 								executionCount: 1,
    // 								metadata: {
    // 									unconfined: true,
    // 									'image/png': { width: '999px' }
    // 								},
    // 								outputType: output_type
    // 							}
    // 						)
    // 					],
    // 					propertiesToExcludeFromComparison
    // 				);
    // 			});
    // 		});
    // 	});
    // });
    // suite('Output Order', () => {
    // 	test('Verify order of outputs', async () => {
    // 		const dataAndExpectedOrder: { output: nbformat.IDisplayData; expectedMimeTypesOrder: string[] }[] = [
    // 			{
    // 				output: {
    // 					data: {
    // 						'application/vnd.vegalite.v4+json': 'some json',
    // 						'text/html': '<a>Hello</a>'
    // 					},
    // 					metadata: {},
    // 					output_type: 'display_data'
    // 				},
    // 				expectedMimeTypesOrder: ['application/vnd.vegalite.v4+json', 'text/html']
    // 			},
    // 			{
    // 				output: {
    // 					data: {
    // 						'application/vnd.vegalite.v4+json': 'some json',
    // 						'application/javascript': 'some js',
    // 						'text/plain': 'some text',
    // 						'text/html': '<a>Hello</a>'
    // 					},
    // 					metadata: {},
    // 					output_type: 'display_data'
    // 				},
    // 				expectedMimeTypesOrder: [
    // 					'application/vnd.vegalite.v4+json',
    // 					'text/html',
    // 					'application/javascript',
    // 					'text/plain'
    // 				]
    // 			},
    // 			{
    // 				output: {
    // 					data: {
    // 						'application/vnd.vegalite.v4+json': '', // Empty, should give preference to other mimetypes.
    // 						'application/javascript': 'some js',
    // 						'text/plain': 'some text',
    // 						'text/html': '<a>Hello</a>'
    // 					},
    // 					metadata: {},
    // 					output_type: 'display_data'
    // 				},
    // 				expectedMimeTypesOrder: [
    // 					'text/html',
    // 					'application/javascript',
    // 					'text/plain',
    // 					'application/vnd.vegalite.v4+json'
    // 				]
    // 			},
    // 			{
    // 				output: {
    // 					data: {
    // 						'text/plain': 'some text',
    // 						'text/html': '<a>Hello</a>'
    // 					},
    // 					metadata: {},
    // 					output_type: 'display_data'
    // 				},
    // 				expectedMimeTypesOrder: ['text/html', 'text/plain']
    // 			},
    // 			{
    // 				output: {
    // 					data: {
    // 						'application/javascript': 'some js',
    // 						'text/plain': 'some text'
    // 					},
    // 					metadata: {},
    // 					output_type: 'display_data'
    // 				},
    // 				expectedMimeTypesOrder: ['application/javascript', 'text/plain']
    // 			},
    // 			{
    // 				output: {
    // 					data: {
    // 						'image/svg+xml': 'some svg',
    // 						'text/plain': 'some text'
    // 					},
    // 					metadata: {},
    // 					output_type: 'display_data'
    // 				},
    // 				expectedMimeTypesOrder: ['image/svg+xml', 'text/plain']
    // 			},
    // 			{
    // 				output: {
    // 					data: {
    // 						'text/latex': 'some latex',
    // 						'text/plain': 'some text'
    // 					},
    // 					metadata: {},
    // 					output_type: 'display_data'
    // 				},
    // 				expectedMimeTypesOrder: ['text/latex', 'text/plain']
    // 			},
    // 			{
    // 				output: {
    // 					data: {
    // 						'application/vnd.jupyter.widget-view+json': 'some widget',
    // 						'text/plain': 'some text'
    // 					},
    // 					metadata: {},
    // 					output_type: 'display_data'
    // 				},
    // 				expectedMimeTypesOrder: ['application/vnd.jupyter.widget-view+json', 'text/plain']
    // 			},
    // 			{
    // 				output: {
    // 					data: {
    // 						'text/plain': 'some text',
    // 						'image/svg+xml': 'some svg',
    // 						'image/png': 'some png'
    // 					},
    // 					metadata: {},
    // 					output_type: 'display_data'
    // 				},
    // 				expectedMimeTypesOrder: ['image/png', 'image/svg+xml', 'text/plain']
    // 			}
    // 		];
    // 		dataAndExpectedOrder.forEach(({ output, expectedMimeTypesOrder }) => {
    // 			const sortedOutputs = jupyterCellOutputToCellOutput(output);
    // 			const mimeTypes = sortedOutputs.items.map((item) => item.mime).join(',');
    // 			assert.equal(mimeTypes, expectedMimeTypesOrder.join(','));
    // 		});
    // 	});
    // });
});
function raceTimeout(promise, timeout, onTimeout) {
    let promiseResolve = undefined;
    const timer = setTimeout(() => {
        promiseResolve?.(undefined);
        onTimeout?.();
    }, timeout);
    return Promise.race([
        Promise.resolve(promise).then(result => {
            clearTimeout(timer);
            return result;
        }, err => {
            clearTimeout(timer);
            throw err;
        }),
        new Promise(resolve => promiseResolve = resolve)
    ]);
}
//# sourceMappingURL=clearOutputs.test.js.map