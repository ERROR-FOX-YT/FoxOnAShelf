import { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import ModalImagenes from './ModalImagenes.jsx';

const FUENTES = [
  { id: 'serif', label: 'Serif', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'sans', label: 'Sans', stack: '-apple-system, system-ui, sans-serif' },
  { id: 'mono', label: 'Mono', stack: '"Fira Code", Consolas, monospace' },
];

const TAMANOS = [
  { value: 14, label: 'XS' },
  { value: 18, label: 'S' },
  { value: 22, label: 'M' },
  { value: 26, label: 'L' },
  { value: 30, label: 'XL' },
];

export default function EditorWYSIWYG({ contenido, onChange, autorId }) {
  const [modalImagenes, setModalImagenes] = useState(false);
  const [colorTexto, setColorTexto] = useState('#1F2937');
  const [colorFondo, setColorFondo] = useState('#FFFFFF');
  const [fuenteActiva, setFuenteActiva] = useState('serif');
  const [tamanoActivo, setTamanoActivo] = useState(22);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
      }),
      HorizontalRule,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Underline,
      Placeholder.configure({
        placeholder: 'Escribe tu historia aquí...',
      }),
      Highlight.configure({
        multicolor: true,
      }),
      FontFamily,
    ],
    content: contenido || '',
    onUpdate: ({ editor: ed }) => {
      onChange && onChange(JSON.stringify(ed.getJSON()));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-8 py-10',
        style: `font-family: ${FUENTES.find(f => f.id === fuenteActiva)?.stack || FUENTES[0].stack}; font-size: ${tamanoActivo}px; line-height: 1.75; color: ${colorTexto}; background-color: ${colorFondo};`,
      },
    },
  });

  useEffect(() => {
    if (editor && contenido !== undefined) {
      try {
        const parsed = JSON.parse(contenido);
        const currentContent = JSON.stringify(editor.getJSON());
        if (contenido !== currentContent && contenido !== '{"type":"doc","content":[]}') {
          editor.commands.setContent(parsed);
        }
      } catch {
        if (contenido && !contenido.startsWith('{')) {
          editor.commands.setContent(`<p>${contenido.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`);
        }
      }
    }
  }, [contenido]);

  const insertarImagen = useCallback((src) => {
    if (editor) {
      editor.chain().focus().setImage({ src, alt: 'imagen del usuario' }).run();
    }
    setModalImagenes(false);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <div className="card p-2 flex flex-wrap items-center gap-1 text-sm sticky top-0 z-10"
           style={{ backgroundColor: 'var(--bg-card, #fff)' }}>
        <select className="input text-xs py-1 px-2 w-24" value={fuenteActiva}
                onChange={e => {
                  setFuenteActiva(e.target.value);
                  const stack = FUENTES.find(f => f.id === e.target.value)?.stack;
                  if (stack && editor) editor.chain().focus().setFontFamily(stack).run();
                }}>
          {FUENTES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>

        <select className="input text-xs py-1 px-2 w-16" value={tamanoActivo}
                onChange={e => setTamanoActivo(Number(e.target.value))}>
          {TAMANOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded text-xs ${editor.isActive('bold') ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Negrita"><b>B</b></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded text-xs ${editor.isActive('italic') ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Cursiva"><i>I</i></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded text-xs ${editor.isActive('underline') ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Subrayado"><u>U</u></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-1.5 rounded text-xs ${editor.isActive('strike') ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Tachado"><s>S</s></button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded text-xs font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Título 1">H1</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Título 2">H2</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`p-1.5 rounded text-xs font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Título 3">H3</button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-1.5 rounded text-xs ${editor.isActive({ textAlign: 'left' }) ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Alinear izquierda">◄</button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-1.5 rounded text-xs ${editor.isActive({ textAlign: 'center' }) ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Centrar">■</button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-1.5 rounded text-xs ${editor.isActive({ textAlign: 'right' }) ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Alinear derecha">►</button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={`p-1.5 rounded text-xs ${editor.isActive({ textAlign: 'justify' }) ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Justificar">𝐽</button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <label className="p-1.5 rounded hover:bg-gray-100 cursor-pointer" title="Color de texto">
          <span className="text-xs font-bold" style={{ color: colorTexto }}>A</span>
          <input type="color" value={colorTexto} className="hidden"
                 onChange={e => { setColorTexto(e.target.value); editor.chain().focus().setColor(e.target.value).run(); }} />
        </label>
        <label className="p-1.5 rounded hover:bg-gray-100 cursor-pointer" title="Color de fondo">
          <span className="text-xs px-1 rounded border" style={{ backgroundColor: colorFondo }}>ab</span>
          <input type="color" value={colorFondo} className="hidden"
                 onChange={e => { setColorFondo(e.target.value); }} />
        </label>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded text-xs ${editor.isActive('bulletList') ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Lista">•≡</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded text-xs ${editor.isActive('orderedList') ? 'bg-foxBrown text-white' : 'hover:bg-gray-100'}`}
                title="Lista numerada">1≡</button>
        <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#FFEB3B' }).run()}
                className={`p-1.5 rounded text-xs ${editor.isActive('highlight') ? 'bg-yellow-400 text-white' : 'hover:bg-gray-100'}`}
                title="Resaltar">🖍</button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button onClick={() => setModalImagenes(true)}
                className="p-1.5 rounded text-xs hover:bg-gray-100" title="Insertar imagen">🖼</button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className="p-1.5 rounded text-xs hover:bg-gray-100" title="Separador horizontal">—</button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="p-1.5 rounded text-xs hover:bg-gray-100 disabled:opacity-30" title="Deshacer">↩</button>
        <button onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="p-1.5 rounded text-xs hover:bg-gray-100 disabled:opacity-30" title="Rehacer">↪</button>
      </div>

      <div className="border border-foxBrown/20 rounded-lg overflow-hidden shadow-inner"
           style={{ backgroundColor: colorFondo }}>
        <EditorContent editor={editor} />
      </div>

      {modalImagenes && (
        <ModalImagenes
          autorId={autorId}
          onSelect={insertarImagen}
          onClose={() => setModalImagenes(false)}
        />
      )}
    </div>
  );
}
