#!/usr/bin/env node

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

console.log('🚀 Setting up VS Code development environment...\n');

const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');

function runCommand(command, options = {}) {
    console.log(`📦 Running: ${command}`);
    try {
        execSync(command, { 
            stdio: 'inherit', 
            cwd: options.cwd || rootDir,
            ...options 
        });
        return true;
    } catch (error) {
        console.error(`❌ Command failed: ${command}`);
        console.error(error.message);
        return false;
    }
}

function main() {
    console.log('1️⃣ Installing root dependencies...');
    if (!runCommand('npm ci')) {
        console.error('❌ Failed to install root dependencies');
        process.exit(1);
    }

    console.log('\n2️⃣ Installing build dependencies...');
    if (!existsSync(buildDir)) {
        console.error('❌ Build directory not found');
        process.exit(1);
    }

    // Try to install build dependencies, skip failing optional dependencies
    if (!runCommand('npm ci --ignore-scripts --audit=false --fund=false', { cwd: buildDir })) {
        console.warn('⚠️  Some build dependencies failed to install, trying without optional dependencies...');
        if (!runCommand('npm ci --ignore-scripts --no-optional --audit=false --fund=false', { cwd: buildDir })) {
            console.error('❌ Failed to install build dependencies');
            console.log('\n📋 Manual setup instructions:');
            console.log('   1. cd build');
            console.log('   2. npm install --no-optional');
            console.log('   3. cd ..');
            console.log('   4. npm run precommit (to test)');
            process.exit(1);
        }
    }

    console.log('\n✅ Setup completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('   • Run "npm run compile" to build the project');
    console.log('   • Run "npm run watch" for continuous compilation');
    console.log('   • Run "npm run precommit" to run pre-commit checks');
    console.log('   • See CONTRIBUTING.md for more development information');
}

if (require.main === module) {
    main();
}

module.exports = { main };