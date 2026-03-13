import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const CSS_FILE = path.join(ROOT, 'src', 'index.css');

const maxComponents = parseInt(process.argv[2] || '1', 10);
console.log(`Buscando clases usadas en máximo ${maxComponents} componente(s)...`);

const output = execSync(`python ${path.join(__dirname, 'find_css_classes_single_component.py')} --max-components ${maxComponents} --json`);
const data = JSON.parse(output.toString());

// Mapa: NombreClase -> Ruta del Componente
const classToComponent = new Map();
for (const [cls, info] of Object.entries(data)) {
    // Verificación de seguridad extra: 
    if (info.components.length === 1) { 
        classToComponent.set(cls, info.components[0]);
    }
}

const componentRoots = new Map();
function getOrCreateComponentRoot(compPath) {
    if (!componentRoots.has(compPath)) {
        componentRoots.set(compPath, postcss.root());
    }
    return componentRoots.get(compPath);
}

// Determina muy estrictamente si una regla CSS pertenece a un solo componente
function getTargetComponent(rule) {
    let targetComp = null;
    
    for (const selector of rule.selectors) {
        // Encontrar todas las clases en el selector (ej: .panel, .btn)
        const matches = [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)];
        if (matches.length === 0) return false; // Selector sin clases (ej: body o h1), PELIGRO. No extraer.
        
        let selectorTarget = null;
        for (const match of matches) {
            const cls = match[1];
            if (classToComponent.has(cls)) {
                selectorTarget = classToComponent.get(cls);
                break; // Con una sola clase atada al componente es seguro encapsular este selector completo
            }
        }
        
        if (!selectorTarget) return false; // Un selector (separado por coma) no tiene dueño, PELIGRO.
        
        if (targetComp === null) {
            targetComp = selectorTarget;
        } else if (targetComp !== selectorTarget) {
            return false; // Peligro: está mezclando clases de múltiples componentes (ej: .comp-a-btn, .comp-b-label)
        }
    }
    return targetComp; // Seguro de extraer si llegamos aquí
}

async function run() {
    const originalCss = fs.readFileSync(CSS_FILE, 'utf8');
    const ast = postcss.parse(originalCss);

    const nodesToRemove = [];

    // Iterar sólamente sobre los nodos raiz y preservar la estructura
    ast.nodes.forEach(node => {
        if (node.type === 'rule') {
            const targetComp = getTargetComponent(node);
            if (targetComp) {
                const compRoot = getOrCreateComponentRoot(targetComp);
                compRoot.append(node.clone());
                nodesToRemove.push(node);
            }
        } else if (node.type === 'atrule' && (node.name === 'media' || node.name === 'supports' || node.name === 'layer')) {
            // Manejar media queries anidadas
            if (!node.nodes) return;
            
            const childMoves = new Map(); // ComponentPath -> Array de Reglas
            const childrenToRemove = [];
            let allChildrenMoved = true;

            node.nodes.forEach(child => {
                if (child.type === 'rule') {
                    const targetComp = getTargetComponent(child);
                    if (targetComp) {
                        if (!childMoves.has(targetComp)) childMoves.set(targetComp, []);
                        childMoves.get(targetComp).push(child.clone());
                        childrenToRemove.push(child);
                    } else {
                        allChildrenMoved = false; // Queda alguna regla huérfana
                    }
                } else {
                    allChildrenMoved = false;
                }
            });

            // Reconstruir los Media Queries para cada componente
            for (const [comp, rules] of childMoves.entries()) {
                const compRoot = getOrCreateComponentRoot(comp);
                const clonedAtRule = node.clone({ nodes: [] });
                rules.forEach(r => clonedAtRule.append(r));
                compRoot.append(clonedAtRule);
            }

            // Limpiar media query original
            childrenToRemove.forEach(c => c.remove());
            // Si el bloque @media se vacía porque movimos todo, poner en cola global para eliminar
            if (allChildrenMoved && node.nodes.length === 0) {
                nodesToRemove.push(node);
            }
        }
    });

    nodesToRemove.forEach(n => n.remove());

    let modifiedComponents = 0;
    for (const [compPathStr, compASTRoot] of componentRoots.entries()) {
        if (compASTRoot.nodes.length === 0) continue;
        
        const compPath = path.join(ROOT, compPathStr);
        if (!fs.existsSync(compPath)) continue;

        const parsedPath = path.parse(compPath);
        const cssFilename = `${parsedPath.name}.css`;
        const componentCssPath = path.join(parsedPath.dir, cssFilename);

        let newCssContent = '';
        if (fs.existsSync(componentCssPath)) {
            newCssContent = fs.readFileSync(componentCssPath, 'utf8') + '\n\n';
        }
        newCssContent += compASTRoot.toString();
        fs.writeFileSync(componentCssPath, newCssContent, 'utf8');

        modifiedComponents++;

        // Importación silenciosa al TSX
        let tsxContent = fs.readFileSync(compPath, 'utf8');
        const importStmt = `import './${cssFilename}';\n`;
        if (!tsxContent.includes(importStmt)) {
            const importMatch = [...tsxContent.matchAll(/^import .*? from .*?;?$/gm)];
            if (importMatch.length > 0) {
                const last = importMatch[importMatch.length - 1];
                const idx = last.index + last[0].length;
                tsxContent = tsxContent.slice(0, idx) + '\n' + importStmt + tsxContent.slice(idx);
            } else {
                tsxContent = importStmt + tsxContent;
            }
            fs.writeFileSync(compPath, tsxContent, 'utf8');
        }
    }

    fs.writeFileSync(CSS_FILE, ast.toString(), 'utf8');
    console.log(`✅ Extracción segura completada: Se actualizaron ${modifiedComponents} componentes preservando @media queries y dependencias globales.`);
}

run().catch(console.error);
