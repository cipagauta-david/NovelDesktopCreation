import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const STYLES_DIR = path.join(SRC_DIR, 'styles');

function normalizeContent(content) {
    return content.replace(/\r\n/g, '\n').trim();
}

function mergeCssContent(existingContent, incomingContent) {
    const normalizedExisting = normalizeContent(existingContent);
    const normalizedIncoming = normalizeContent(incomingContent);

    if (!normalizedIncoming) {
        return existingContent;
    }

    if (!normalizedExisting) {
        return incomingContent;
    }

    if (normalizedExisting.includes(normalizedIncoming)) {
        return existingContent;
    }

    return `${existingContent.trimEnd()}\n\n${incomingContent.trimStart()}`;
}

function removeDuplicateImportLines(content) {
    const lines = content.split(/\r?\n/);
    const seen = new Set();
    const result = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (/^import\s+['"].+\.css['"];?$/.test(trimmed)) {
            if (seen.has(trimmed)) continue;
            seen.add(trimmed);
        }
        result.push(line);
    }

    return result.join('\n');
}

// Función recursiva para obtener archivos por extensión
function getAllFiles(dir, ext, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            if (file !== 'styles' && file !== 'node_modules') {
                getAllFiles(filepath, ext, fileList);
            }
        } else if (filepath.endsWith(ext)) {
            fileList.push(filepath);
        }
    }
    return fileList;
}

async function centralizeMirror() {
    console.log('Iniciando centralización en modo espejo...');
    const cssFiles = getAllFiles(SRC_DIR, '.css');
    let movedCount = 0;
    let mergedCount = 0;

    for (const cssPath of cssFiles) {
        const basename = path.basename(cssPath);
        
        // Ignorar el index.css global o archivos que ya estén en styles/
        if (basename === 'index.css' || cssPath.includes(path.join('src', 'styles'))) {
            continue;
        }

        // 1. Calcular la ruta relativa original desde src/
        let relPathFromSrc = path.relative(SRC_DIR, cssPath);
        
        // 2. Aplicar la regla: si está dentro de "components", nos saltamos esa subcarpeta
        // relPathFromSrc puede ser "components/layout/Sidebar.css" o "components\layout\Sidebar.css"
        const componentsPrefix = `components${path.sep}`;
        if (relPathFromSrc.startsWith(componentsPrefix)) {
            relPathFromSrc = relPathFromSrc.substring(componentsPrefix.length);
        }

        // 3. Determinar el nuevo destino en styles/
        const newCssPath = path.join(STYLES_DIR, relPathFromSrc);
        const newCssDir = path.dirname(newCssPath);

        // 4. Crear los directorios necesarios
        if (!fs.existsSync(newCssDir)) {
            fs.mkdirSync(newCssDir, { recursive: true });
        }

        // 5. Mover o fusionar el archivo CSS sin perder contenido existente
        if (fs.existsSync(newCssPath)) {
            const existingCss = fs.readFileSync(newCssPath, 'utf8');
            const incomingCss = fs.readFileSync(cssPath, 'utf8');
            const mergedCss = mergeCssContent(existingCss, incomingCss);
            fs.writeFileSync(newCssPath, mergedCss, 'utf8');
            fs.unlinkSync(cssPath);
            mergedCount++;
        } else {
            fs.renameSync(cssPath, newCssPath);
            movedCount++;
        }

        // 6. Buscar el componente (.tsx o .ts) en la carpeta ORIGINAL
        const originalDir = path.dirname(cssPath);
        const componentFiles = [];
        getAllFiles(originalDir, '.tsx', componentFiles);
        getAllFiles(originalDir, '.ts', componentFiles);

        for (const compPath of componentFiles) {
            // Solo nos interesan archivos en la misa carpeta exacta, getAllFiles es recursivo pero empezamos desde originalDir, asi que filtramos a primer nivel
            if (path.dirname(compPath) !== originalDir) continue;

            let content = fs.readFileSync(compPath, 'utf8');
            
            // Buscar la importación antigua: import './Sidebar.css';
            const importRegexStr = `import\\s+['"]\\.\\/${basename}['"];?\\n?`;
            const importRegex = new RegExp(importRegexStr, 'g');
            
            if (importRegex.test(content)) {
                // Calcular la ruta relativa correcta desde la carpeta del .tsx hacia la nueva ruta del .css
                let relativePath = path.relative(originalDir, newCssPath).replace(/\\/g, '/');
                if (!relativePath.startsWith('.')) {
                    relativePath = './' + relativePath;
                }
                
                const newImport = `import '${relativePath}';\n`;
                content = content.replace(importRegex, newImport);
                content = removeDuplicateImportLines(content);
                fs.writeFileSync(compPath, content, 'utf8');
                console.log(`  ↪ Actualizado import en: ${path.relative(ROOT, compPath)}`);
            }
        }
        console.log(`📦 Procesado: ${path.relative(ROOT, cssPath)} -> ${path.relative(ROOT, newCssPath)}`);
    }

    console.log(`\n✅ Centralización completada. Movidos: ${movedCount}, fusionados: ${mergedCount}, total: ${movedCount + mergedCount}.`);
}

centralizeMirror().catch(console.error);