#!/usr/bin/env node

/**
 * Port Cleaner Utility
 * 
 * This script identifies and kills processes running on specific ports
 * that are used by the CompendiumnNav2 application.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Ports used by the application
const PORTS = [3001, 3002, 9753];

/**
 * Find process IDs using a specific port
 * @param {number} port - The port number to check
 * @returns {Promise<string[]>} - Array of process IDs
 */
async function findProcessesByPort(port) {
  try {
    // Use lsof to find processes using the port
    const { stdout } = await execPromise(`lsof -i :${port} -t`);
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    // If lsof returns nothing, no process is using the port
    return [];
  }
}

/**
 * Find process IDs using a specific port with netstat as fallback
 * This is more aggressive and can find processes that lsof might miss
 * @param {number} port - The port number to check
 * @returns {Promise<string[]>} - Array of process IDs
 */
async function findProcessesByPortAggressive(port) {
  const pids = await findProcessesByPort(port);
  if (pids.length > 0) return pids;
  
  try {
    // Try netstat as a fallback
    const { stdout } = await execPromise(`netstat -anv | grep LISTEN | grep ${port}`);
    const lines = stdout.trim().split('\n').filter(Boolean);
    
    const netstatPids = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      // The PID is typically in the 9th column in macOS netstat output
      if (parts.length >= 9) {
        const pid = parts[8];
        if (pid && !isNaN(parseInt(pid))) {
          netstatPids.push(pid);
        }
      }
    }
    
    return netstatPids;
  } catch (error) {
    return [];
  }
}

/**
 * Kill a process by its ID
 * @param {string} pid - Process ID to kill
 * @returns {Promise<boolean>} - Whether the process was killed successfully
 */
async function killProcess(pid) {
  try {
    await execPromise(`kill -9 ${pid}`);
    return true;
  } catch (error) {
    console.error(`Failed to kill process ${pid}:`, error.message);
    return false;
  }
}

/**
 * Check if a port is in use
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} - Whether the port is in use
 */
async function isPortInUse(port) {
  try {
    const { stdout } = await execPromise(`lsof -i :${port} | grep LISTEN`);
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Clean all specified ports
 */
async function cleanPorts() {
  console.log('🧹 Starting port cleanup process...');
  
  for (const port of PORTS) {
    console.log(`\n📌 Checking port ${port}...`);
    
    // Use the aggressive method to find all processes
    const pids = await findProcessesByPortAggressive(port);
    
    if (pids.length === 0) {
      console.log(`✅ Port ${port} is already free.`);
      continue;
    }
    
    console.log(`🔍 Found ${pids.length} process(es) using port ${port}: ${pids.join(', ')}`);
    
    for (const pid of pids) {
      console.log(`🚫 Killing process ${pid}...`);
      const success = await killProcess(pid);
      
      if (success) {
        console.log(`✅ Process ${pid} killed successfully.`);
      } else {
        console.log(`❌ Failed to kill process ${pid}.`);
      }
    }
    
    // Double-check with both methods to be extra sure
    const remainingPids = await findProcessesByPortAggressive(port);
    if (remainingPids.length > 0) {
      console.log(`⚠️ Port ${port} still has processes: ${remainingPids.join(', ')}. Trying force kill...`);
      for (const pid of remainingPids) {
        // Try force kill with SIGKILL
        try {
          await execPromise(`kill -9 ${pid}`);
          console.log(`✅ Force killed process ${pid}.`);
        } catch (error) {
          console.error(`❌ Failed to force kill process ${pid}: ${error.message}`);
        }
      }
    }
    
    // Final verification
    const stillInUse = await isPortInUse(port);
    if (stillInUse) {
      console.log(`⚠️ Port ${port} is still in use after cleanup attempt.`);
    } else {
      console.log(`✅ Port ${port} is now free.`);
    }
  }
  
  console.log('\n🎉 Port cleanup process completed!');
}

// Run the cleanup
cleanPorts().catch(error => {
  console.error('Error during port cleanup:', error);
  process.exit(1);
});
