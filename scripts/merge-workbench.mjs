// Put the built workbench (dist/) under the showcase at dist-site/workbench/.
import { cpSync, existsSync, rmSync } from 'node:fs';

if (!existsSync('dist') || !existsSync('dist-site')) throw new Error('Run the workbench and site builds first.');
rmSync('dist-site/workbench', { recursive: true, force: true });
cpSync('dist', 'dist-site/workbench', { recursive: true });
console.log('Workbench copied to dist-site/workbench/');
