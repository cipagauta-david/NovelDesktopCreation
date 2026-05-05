import os
import re

# Always resolve paths relative to the workspace root (parent of scripts/)
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(WORKSPACE_ROOT)

def get_jsx_components(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Look for imports from our components
    imports = {}
    import_pattern = re.compile(r'import\s+{([^}]+)}\s+from\s+[\'"]([.\/]+(components\/[^\'"]+|[^\'"]+))[\'"]')
    for match in import_pattern.finditer(content):
        imported_items = [item.strip() for item in match.group(1).split(',')]
        import_path = match.group(2)
        
        # Clean up path to get relative path to src/components
        for item in imported_items:
            # Handle aliases: `Item as Alias`
            item_name = item.split(' as ')[0].strip()
            imports[item_name] = import_path
            
    # Also look for default imports
    default_import_pattern = re.compile(r'import\s+([A-Z][a-zA-Z0-9_]*)\s+from\s+[\'"]([.\/]+([^[\'"]+))[\'"]')
    for match in default_import_pattern.finditer(content):
        imports[match.group(1)] = match.group(2)
        
    # 2. Look for JSX tags used in the file
    components_used = []
    # Match <ComponentName or <ComponentName>
    jsx_pattern = re.compile(r'<([A-Z][a-zA-Z0-9_]*)')
    for match in jsx_pattern.finditer(content):
        comp = match.group(1)
        if comp in imports:
            components_used.append((comp, imports[comp]))
        else:
            components_used.append((comp, "local/unknown"))
            
    return sorted(list(set(components_used)))

def resolve_path(current_file, import_path):
    if not import_path.startswith('.'):
        return None
        
    dir_name = os.path.dirname(current_file)
    target = os.path.normpath(os.path.join(dir_name, import_path))
    
    if os.path.isfile(target):
        return target
    if os.path.isfile(target + '.tsx'):
        return target + '.tsx'
    if os.path.isfile(target + '.ts'):
        return target + '.ts'
    if os.path.isdir(target):
        if os.path.isfile(os.path.join(target, 'index.tsx')):
            return os.path.join(target, 'index.tsx')
        if os.path.isfile(os.path.join(target, 'index.ts')):
            return os.path.join(target, 'index.ts')
            
    return None

def build_tree(start_file, max_depth=10):
    visited = set()
    
    def traverse(file_path, depth):
        if depth > max_depth or not file_path:
            return ""
            
        indent = "  " * depth
        name = os.path.basename(file_path)
        result = [f"{indent}- {name} (File: {file_path})"]
        
        if file_path in visited:
            result[0] += " [Recursive/Repeated]"
            return "\n".join(result)
            
        visited.add(file_path)
        
        if not file_path.endswith('.tsx') and not file_path.endswith('.ts'):
            return "\n".join(result)
            
        try:
            components = get_jsx_components(file_path)
            for comp_name, import_path in components:
                target_path = resolve_path(file_path, import_path) if import_path != "local/unknown" else None
                
                if target_path:
                    # Recursive call
                    child_str = traverse(target_path, depth + 1)
                    if child_str:
                        result.append(child_str)
                else:
                    result.append(f"{indent}  - {comp_name} [{import_path}]")
        except Exception as e:
            result.append(f"{indent}  - Error: {e}")
            
        visited.remove(file_path) # allow repeats in other branches as requested
        return "\n".join(result)
        
    return traverse(start_file, 0)

print(build_tree("src/App.tsx"))
