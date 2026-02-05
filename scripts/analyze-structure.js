#!/usr/bin/env node

/**
 * Extract React component structure for LLM context sharing
 * Outputs: components, exports, imports, props interfaces
 */

import { Project } from 'ts-morph';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configurable output directory
const outputDir = process.env.OUTPUT_DIR || 'docs/app-structure';

const project = new Project({
  tsConfigFilePath: join(projectRoot, 'tsconfig.json'),
});

const analysis = {
  metadata: {
    generatedAt: new Date().toISOString(),
    projectRoot: projectRoot,
    outputDirectory: outputDir,
  },
  components: [],
  plugins: [],
  services: [],
  hooks: [],
  types: [],
  structure: {}
};

// Analyze source files
const sourceFiles = project.getSourceFiles('src/**/*.{ts,tsx}');

sourceFiles.forEach(sourceFile => {
  const relativePath = sourceFile.getFilePath().replace(projectRoot + '/', '');
  
  // Skip test files
  if (relativePath.includes('__tests__') || relativePath.includes('.test.')) {
    return;
  }

  const fileAnalysis = {
    path: relativePath,
    exports: [],
    imports: [],
    components: [],
    hooks: [],
    types: []
  };

  // Extract imports
  sourceFile.getImportDeclarations().forEach(imp => {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    const namedImports = imp.getNamedImports().map(ni => ni.getName());
    const defaultImport = imp.getDefaultImport()?.getText();
    
    if (namedImports.length > 0 || defaultImport) {
      fileAnalysis.imports.push({
        from: moduleSpecifier,
        default: defaultImport,
        named: namedImports
      });
    }
  });

  // Extract exports
  sourceFile.getExportedDeclarations().forEach((declarations, name) => {
    declarations.forEach(declaration => {
      const kind = declaration.getKindName();
      fileAnalysis.exports.push({ name, kind });

      // Categorize exports
      if (kind === 'FunctionDeclaration' || kind === 'VariableDeclaration') {
        const text = declaration.getText();
        
        // Detect React components (returns JSX)
        if (text.includes('return') && (text.includes('JSX.Element') || text.includes('<') || text.includes('React.FC'))) {
          fileAnalysis.components.push({
            name,
            type: 'function',
            props: extractProps(declaration)
          });
        }
        
        // Detect hooks (starts with 'use')
        if (name.startsWith('use')) {
          fileAnalysis.hooks.push({
            name,
            returns: extractReturnType(declaration)
          });
        }
      }
      
      // Extract TypeScript interfaces and types
      if (kind === 'InterfaceDeclaration' || kind === 'TypeAliasDeclaration') {
        fileAnalysis.types.push({
          name,
          kind,
          definition: declaration.getText().split('\n').slice(0, 5).join('\n') + '...'
        });
      }
    });
  });

  // Categorize file by directory
  if (relativePath.includes('/components/')) {
    analysis.components.push(fileAnalysis);
  } else if (relativePath.includes('/plugins/')) {
    analysis.plugins.push(fileAnalysis);
  } else if (relativePath.includes('/services/')) {
    analysis.services.push(fileAnalysis);
  } else if (relativePath.includes('/hooks/')) {
    analysis.hooks.push(fileAnalysis);
  } else if (relativePath.includes('/types/')) {
    analysis.types.push(fileAnalysis);
  }
});

// Helper: Extract props from component
function extractProps(declaration) {
  try {
    const params = declaration.getDescendantsOfKind(165); // SyntaxKind.Parameter
    if (params.length > 0) {
      const typeText = params[0].getType().getText();
      return typeText.length > 200 ? typeText.substring(0, 200) + '...' : typeText;
    }
  } catch (e) {
    // Ignore
  }
  return 'unknown';
}

// Helper: Extract return type
function extractReturnType(declaration) {
  try {
    const returnType = declaration.getType().getText();
    return returnType.length > 100 ? returnType.substring(0, 100) + '...' : returnType;
  } catch (e) {
    return 'unknown';
  }
}

// Generate directory structure
function buildStructure(items) {
  const tree = {};
  items.forEach(item => {
    const parts = item.path.split('/');
    let current = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        current[part] = {
          exports: item.exports.map(e => e.name),
          components: item.components.map(c => c.name)
        };
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    });
  });
  return tree;
}

analysis.structure = {
  components: buildStructure(analysis.components),
  plugins: buildStructure(analysis.plugins),
  services: buildStructure(analysis.services)
};

// Ensure output directory exists
const fullOutputPath = join(projectRoot, outputDir);
mkdirSync(fullOutputPath, { recursive: true });

// Output results
const outputPath = join(fullOutputPath, 'component-analysis.json');
writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
console.log(`✅ Analysis complete: ${outputPath}`);

// Also create a markdown summary
const markdown = generateMarkdown(analysis);
const mdPath = join(fullOutputPath, 'component-analysis.md');
writeFileSync(mdPath, markdown);
console.log(`✅ Markdown summary: ${mdPath}`);

function generateMarkdown(analysis) {
  let md = '# React Application Structure Analysis\n\n';
  md += `Generated: ${analysis.metadata.generatedAt}\n\n`;
  
  md += '## Components\n\n';
  analysis.components.forEach(file => {
    if (file.components.length > 0) {
      md += `### ${file.path}\n`;
      file.components.forEach(comp => {
        md += `- **${comp.name}** (${comp.type})\n`;
        if (comp.props !== 'unknown') {
          md += `  - Props: \`${comp.props}\`\n`;
        }
      });
      md += '\n';
    }
  });

  md += '## Plugins\n\n';
  analysis.plugins.forEach(file => {
    md += `### ${file.path}\n`;
    md += `Exports: ${file.exports.map(e => e.name).join(', ')}\n\n`;
  });

  md += '## Services\n\n';
  analysis.services.forEach(file => {
    md += `### ${file.path}\n`;
    md += `Exports: ${file.exports.map(e => e.name).join(', ')}\n\n`;
  });

  md += '## Hooks\n\n';
  analysis.hooks.forEach(file => {
    if (file.hooks.length > 0) {
      md += `### ${file.path}\n`;
      file.hooks.forEach(hook => {
        md += `- **${hook.name}**\n`;
        if (hook.returns !== 'unknown') {
          md += `  - Returns: \`${hook.returns}\`\n`;
        }
      });
      md += '\n';
    }
  });

  return md;
}
