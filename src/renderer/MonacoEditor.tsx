import { FunctionComponent, h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
    data: string;
    language: string;
    active: boolean;
    readOnly?: boolean;
}

// Configuration interface for renderer settings
interface RendererSettings {
    theme?: 'auto' | 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
    fontSize?: number;
    fontFamily?: string;
    lineNumbers?: 'on' | 'off' | 'relative';
    minimap?: boolean;
    wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
}

// Global settings that can be updated
let globalSettings: RendererSettings = {
    theme: 'auto',
    fontSize: 13,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    lineNumbers: 'on',
    minimap: false,
    wordWrap: 'off',
};

// Function to update settings from extension
(window as any).updateMonacoSettings = (settings: RendererSettings) => {
    globalSettings = { ...globalSettings, ...settings };
    console.log('Monaco settings updated:', globalSettings);
};

// Detect VS Code theme
function detectVSCodeTheme(): 'vs' | 'vs-dark' | 'hc-black' | 'hc-light' {
    const themeKind = document.body.getAttribute('data-vscode-theme-kind');
    const themeName = document.body.getAttribute('data-vscode-theme-name');

    // High contrast themes
    if (themeName?.toLowerCase().includes('high contrast')) {
        return themeKind?.includes('light') ? 'hc-light' : 'hc-black';
    }

    // Regular themes based on kind
    if (themeKind?.includes('light')) {
        return 'vs';
    } else if (themeKind?.includes('dark')) {
        return 'vs-dark';
    }

    // Default to dark
    return 'vs-dark';
}

// Get effective theme based on settings
function getEffectiveTheme(settingTheme: string = 'auto'): 'vs' | 'vs-dark' | 'hc-black' | 'hc-light' {
    if (settingTheme === 'auto') {
        return detectVSCodeTheme();
    }
    return settingTheme as 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
}

// Map language extensions to Monaco language identifiers
const languageMap: Record<string, string> = {
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'txt': 'plaintext',
    'http': 'http',
    'javascript': 'javascript',
    'js': 'javascript',
    'typescript': 'typescript',
    'ts': 'typescript',
    'css': 'css',
    'yaml': 'yaml',
    'yml': 'yaml',
    'markdown': 'markdown',
    'md': 'markdown',
};

// Format content before displaying in Monaco
function formatContent(content: string, language: string): string {
    try {
        switch (language) {
            case 'json':
                // Format JSON with 2-space indentation
                return JSON.stringify(JSON.parse(content), null, 2);

            case 'xml':
            case 'html':
                // Simple XML/HTML formatting
                return formatXml(content);

            case 'javascript':
            case 'js':
            case 'typescript':
            case 'ts':
                // Basic JS/TS formatting (add newlines after braces)
                return formatJavaScript(content);

            case 'css':
                // Basic CSS formatting
                return formatCss(content);

            default:
                return content;
        }
    } catch (error) {
        console.warn(`Failed to format ${language}:`, error);
        return content;
    }
}

// Simple XML formatter
function formatXml(xml: string): string {
    let formatted = '';
    let indent = 0;
    const tab = '  '; // 2 spaces

    xml.split(/>\s*</).forEach((node) => {
        if (node.match(/^\/\w/)) indent--; // Closing tag
        formatted += tab.repeat(indent) + '<' + node + '>\n';
        if (node.match(/^<?\w[^>]*[^\/]$/)) indent++; // Opening tag
    });

    return formatted.substring(1, formatted.length - 2);
}

// Simple JavaScript formatter
function formatJavaScript(js: string): string {
    // Basic formatting - add newlines after braces
    return js
        .replace(/\{/g, '{\n')
        .replace(/\}/g, '\n}')
        .replace(/;/g, ';\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}

// Simple CSS formatter
function formatCss(css: string): string {
    return css
        .replace(/\{/g, ' {\n  ')
        .replace(/\}/g, '\n}\n')
        .replace(/;/g, ';\n  ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
}

export const MonacoEditor: FunctionComponent<MonacoEditorProps> = ({
    data,
    language,
    active,
    readOnly = true,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const monacoInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    // Format the data before displaying
    const monacoLanguage = languageMap[language] || 'plaintext';
    const formattedData = formatContent(data, monacoLanguage);

    // Calculate dynamic height based on content
    const lineCount = formattedData.split('\n').length;
    const lineHeight = 19; // Monaco default line height
    const padding = 10; // Top and bottom padding
    const minHeight = 100; // Minimum height
    const maxHeight = 600; // Maximum height

    // Calculate height: lineCount * lineHeight + padding, clamped between min and max
    const contentHeight = Math.max(minHeight, Math.min(maxHeight, lineCount * lineHeight + padding));

    console.log('Monaco height calculation:', {
        lineCount,
        calculatedHeight: contentHeight,
        dataLength: formattedData.length,
    });

    // Initialize editor
    useEffect(() => {
        if (!editorRef.current) return;

        const effectiveTheme = getEffectiveTheme(globalSettings.theme);

        console.log('Creating Monaco editor:', {
            language,
            monacoLanguage,
            dataLength: data.length,
            formattedLength: formattedData.length,
            theme: effectiveTheme,
            settings: globalSettings,
        });

        // Create Monaco editor instance with formatted content
        const editor = monaco.editor.create(editorRef.current, {
            value: formattedData,
            language: monacoLanguage,
            theme: effectiveTheme,
            readOnly: readOnly,
            automaticLayout: true,
            minimap: { enabled: globalSettings.minimap ?? false },
            scrollBeyondLastLine: false,
            lineNumbers: globalSettings.lineNumbers ?? 'on',
            renderLineHighlight: 'none',
            contextmenu: true,
            folding: true,
            glyphMargin: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                useShadows: false,
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
            },
            wordWrap: globalSettings.wordWrap ?? 'off',
            fontSize: globalSettings.fontSize ?? 13,
            fontFamily: globalSettings.fontFamily ?? 'Menlo, Monaco, "Courier New", monospace',
            tabSize: 2,
            insertSpaces: true,
        });

        monacoInstanceRef.current = editor;

        console.log('Monaco editor created with formatted content');

        // Cleanup on unmount
        return () => {
            editor.dispose();
            monacoInstanceRef.current = null;
        };
    }, []);

    // Update editor content when data changes
    useEffect(() => {
        const editor = monacoInstanceRef.current;
        if (!editor) return;

        const currentValue = editor.getValue();
        const newFormattedData = formatContent(data, monacoLanguage);

        // Only update if content actually changed
        if (currentValue === newFormattedData) return;

        console.log('Updating editor with new formatted content');

        // Update model language if changed
        const model = editor.getModel();
        if (model && model.getLanguageId() !== monacoLanguage) {
            monaco.editor.setModelLanguage(model, monacoLanguage);
        }

        // Set formatted value
        editor.setValue(newFormattedData);
    }, [data, language, formattedData]);

    // Update theme when it changes (only if theme is set to 'auto')
    useEffect(() => {
        const observer = new MutationObserver(() => {
            // Only auto-update theme if setting is 'auto'
            if (globalSettings.theme === 'auto') {
                const effectiveTheme = detectVSCodeTheme();
                monaco.editor.setTheme(effectiveTheme);
                console.log('VS Code theme changed, updating Monaco to:', effectiveTheme);
            }
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-vscode-theme-kind', 'data-vscode-theme-name'],
        });

        return () => observer.disconnect();
    }, []);

    // Watch for settings changes and update editor
    useEffect(() => {
        const editor = monacoInstanceRef.current;
        if (!editor) return;

        // Update theme if settings changed
        const effectiveTheme = getEffectiveTheme(globalSettings.theme);
        monaco.editor.setTheme(effectiveTheme);

        // Update editor options
        editor.updateOptions({
            fontSize: globalSettings.fontSize ?? 13,
            fontFamily: globalSettings.fontFamily ?? 'Menlo, Monaco, "Courier New", monospace',
            lineNumbers: globalSettings.lineNumbers ?? 'on',
            minimap: { enabled: globalSettings.minimap ?? false },
            wordWrap: globalSettings.wordWrap ?? 'off',
        });
    }, [globalSettings]);

    return (
        <div
            class="tab-content monaco-editor-container"
            hidden={!active}
            style={{ height: `${contentHeight}px`, width: '100%', minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
            title="Content is automatically formatted"
        >
            <div ref={editorRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
};
