import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const maxComponents = process.argv[2] || '1';

function runNodeScript(scriptName, args = []) {
    const scriptPath = path.join(__dirname, scriptName);
    const result = spawnSync(process.execPath, [scriptPath, ...args], {
        cwd: ROOT,
        stdio: 'inherit',
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`Falló ${scriptName} con código ${result.status}`);
    }
}

function main() {
    console.log('🚀 Flujo unificado: extracción + centralización CSS');
    console.log(`Parámetro: max-components=${maxComponents}`);

    runNodeScript('extract_css.mjs', [maxComponents]);
    runNodeScript('centralize_css.mjs');

    console.log('✅ Flujo completado sin sobrescribir CSS existente.');
}

main();
