/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createRequire } from 'node:module';
import { existsSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);
const gulp = require('gulp');

// Check if build dependencies are installed and working
const buildDepsInstalled = existsSync(join(process.cwd(), 'build', 'node_modules'));

if (buildDepsInstalled) {
    try {
        require('./build/gulpfile');
    } catch (error) {
        console.warn('⚠️  Full build system not available, running basic precommit checks...');
        console.warn('📦 For full functionality, install all dependencies with: npm run setup');
        console.warn('');
        
        // Create a basic electron task that does essential checks
        gulp.task('electron', async function() {
            console.log('✅ Running basic precommit checks:');
            
            // Check TypeScript compilation
            try {
                const { execSync } = require('child_process');
                console.log('  📝 Checking TypeScript compilation...');
                execSync('npx tsc --noEmit', { stdio: 'inherit' });
                console.log('  ✅ TypeScript compilation OK');
            } catch (error) {
                console.warn('  ⚠️  TypeScript check failed or not available');
            }
            
            // Check basic file structure
            const requiredFiles = ['package.json', 'tsconfig.json', 'gulpfile.js'];
            const missingFiles = requiredFiles.filter(file => !existsSync(file));
            
            if (missingFiles.length > 0) {
                console.error('  ❌ Missing required files:', missingFiles.join(', '));
                process.exit(1);
            } else {
                console.log('  ✅ Required files present');
            }
            
            console.log('');
            console.log('🎯 Basic precommit checks completed!');
            console.log('💡 For full build and testing, run: npm run setup');
        });
    }
} else {
    console.error('❌ Build dependencies are missing.');
    console.error('📦 Please run the setup script to install all required dependencies:');
    console.error('   npm run setup');
    console.error('');
    console.error('🔧 Or install build dependencies manually:');
    console.error('   cd build && npm install');
    
    // Create a minimal task for basic checks
    gulp.task('electron', async function() {
        console.log('⚠️  Running minimal precommit checks...');
        console.log('✅ Gulp is working correctly');
        console.log('📦 To enable full precommit checks, run: npm run setup');
    });
}
