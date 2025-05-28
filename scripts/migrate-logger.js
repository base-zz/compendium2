#!/usr/bin/env node

/**
 * Migration script to update imports from the old logger to the new logger
 * 
 * This script will:
 * 1. Find all files that import from the old logger
 * 2. Update the import statements
 * 3. Update the logger usage to match the new API
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, extname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = resolve(__dirname, '..');
const OLD_LOGGER_PATH = 'src/client/services/logger';
const NEW_LOGGER_PATH = 'src/client/services/logger-new';

// Recursively find all files with the given extensions in a directory
function findFiles(dir, extensions, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other common directories
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        findFiles(filePath, extensions, fileList);
      }
    } else if (extensions.includes(extname(file).toLowerCase())) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Find all JavaScript/TypeScript files that import the old logger
function findFilesUsingOldLogger() {
  try {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
    const allFiles = findFiles(PROJECT_ROOT, extensions);
    const importPattern = new RegExp(`from\\s+['"]${OLD_LOGGER_PATH}['"]`);
    
    return allFiles.filter(file => {
      try {
        const content = readFileSync(file, 'utf-8');
        return importPattern.test(content);
      } catch (error) {
        console.warn(`Error reading file ${file}:`, error.message);
        return false;
      }
    });
  } catch (error) {
    console.error('Error finding files using old logger:', error);
    return [];
  }
}

// Update a single file to use the new logger
function updateFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let updated = false;

    // Update import statements
    const importRegex = new RegExp(`from\\s+['"]${OLD_LOGGER_PATH.replace(/\//g, '[/\\\\]')}['"]`, 'g');
    if (importRegex.test(content)) {
      content = content.replace(importRegex, `from '${NEW_LOGGER_PATH}'`);
      updated = true;
    }

    // Update logger usage - this is a simple replacement, might need manual review
    const loggerRegex = /(?:logger|createLogger)\(([^)]+)\)/g;
    if (loggerRegex.test(content)) {
      // This is a simple replacement - manual review recommended
      content = content.replace(loggerRegex, 'createLogger($1)');
      updated = true;
    }

    if (updated) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Updated: ${filePath.replace(PROJECT_ROOT + '/', '')}`);
    } else {
      console.log(`ℹ️  No changes needed: ${filePath.replace(PROJECT_ROOT + '/', '')}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Main function
function main() {
  console.log('🚀 Starting logger migration...\n');
  
  // Find all files using the old logger
  const files = findFilesUsingOldLogger();
  
  if (files.length === 0) {
    console.log('✅ No files found using the old logger.');
    return;
  }
  
  console.log(`🔍 Found ${files.length} files using the old logger:\n`);
  
  // Update each file
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file.replace(PROJECT_ROOT + '/', '')}`);
    updateFile(file);
  });
  
  console.log('\n✅ Migration complete!');
  console.log('\n⚠️  Please review the changes and test your application.');
  console.log('The new logger has a similar but not identical API to the old one.');
  console.log('You may need to make additional manual adjustments.');
  console.log('\nKey changes to be aware of:');
  console.log('1. The logger now uses loglevel under the hood');
  console.log('2. Log methods are now async (returns a Promise)');
  console.log('3. Remote logging is handled automatically based on preferences');
  console.log('4. The data() method is now a first-class citizen');
}

// Run the migration
main();
