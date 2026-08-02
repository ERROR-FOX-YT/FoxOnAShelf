import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
  return `hace ${Math.floor(months / 12)} año${Math.floor(months / 12) > 1 ? 's' : ''}`;
}

function Avatar({ name, url }) {
  const letter = (name || '?').charAt(0).toUpperCase();
  return (
    <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-amber-200 dark:bg-amber-700 flex items-center justify-center text-sm font-bold text-amber-900 dark:text-amber-100">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : letter}
    </div>
  );
}

function CommentItem({ c, bookId, onDelete, onReply, replyOpen, setReplyOpen }) {
  const { user } = useAuth();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');

  const isOwner = user && user.id === c.usuario_id;
  const isMod = user && (user.role === 'moderator' || user.role === 'admin');
  const canDel = user && (isOwner || isMod);
  const canReply = user && !c.comentario_padre_id;

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim()) { toast.error('Escribe algo antes de responder'); return; }
    setSending(true);
    const r = await api.post('/api/libros/' + bookId + '/comentario', {
      contenido: replyText, comentario_padre_id: c.id
    });
    setSending(false);
    if (!r.__error) {
      setReplyText('');
      setReplyOpen(null);
      onReply();
      toast.ok('Respuesta publicada');
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <Avatar name={c.nombre_autor} url={c.avatar_autor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-accent-secondary">
              {c.nombre_autor || 'Anónimo'}
            </span>
            <span className="text-xs opacity-50">{timeAgo(c.created_at)}</span>
            {canDel && (
              <button className="ml-auto text-xs font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      onClick={() => { if (window.confirm('¿Eliminar este comentario?')) { onDelete(c.id); } }}>
                Eliminar
              </button>
            )}
          </div>
          <div className="text-sm whitespace-pre-wrap break-words">{c.contenido}</div>
          {canReply && (
            <button className="text-xs font-semibold opacity-60 hover:opacity-100 mt-0.5"
                    onClick={() => setReplyOpen(replyOpen === c.id ? null : c.id)}>
              Responder
            </button>
          )}
        </div>
      </div>
      {replyOpen === c.id && (
        <form onSubmit={handleReply} className="mt-2 ml-10 flex gap-2">
          <input className="input flex-1 text-sm" placeholder="Escribe una respuesta..."
                 value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus />
          <button className="btn-primary text-sm" disabled={sending}>
            {sending ? '...' : 'Responder'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function Comments({ bookId }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [replyOpen, setReplyOpen] = useState(null);
  const [expanded, setExpanded] = useState({});

  async function load() {
    const r = await api.get('/api/libros/' + bookId + '/comentarios');
    if (!r.__error) setItems(r.comentarios || []);
  }
  useEffect(() => { load(); }, [bookId]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) { toast.error('Escribe algo antes de comentar'); return; }
    const r = await api.post('/api/libros/' + bookId + '/comentario', { contenido: text });
    if (!r.__error) { setText(''); load(); toast.ok('Comentario publicado'); }
  }

  async function remove(commentId) {
    const r = await api.del('/api/libros/' + bookId + '/comentarios/' + commentId);
    if (!r.__error) { load(); toast.ok('Comentario eliminado'); }
  }

  const topLevel = items.filter(c => !c.comentario_padre_id);
  const repliesByParent = {};
  for (const c of items) {
    if (c.comentario_padre_id) {
      if (!repliesByParent[c.comentario_padre_id]) repliesByParent[c.comentario_padre_id] = [];
      repliesByParent[c.comentario_padre_id].push(c);
    }
  }
  for (const key of Object.keys(repliesByParent)) {
    repliesByParent[key].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="card p-4">
      <h3 className="font-serif text-lg font-bold mb-2">Comentarios</h3>

      {user && (
        <form onSubmit={send} className="flex gap-2 mb-4">
          <Avatar name={user.nombre_mostrado} url={user.url_avatar} />
          <input className="input flex-1" placeholder="Añade un comentario..."
                 value={text} onChange={e => setText(e.target.value)} />
          <button className="btn-primary">Comentar</button>
        </form>
      )}

      <div className="space-y-3 max-h-96 overflow-auto">
        {topLevel.length === 0 && (
          <div className="opacity-70 text-sm">{user ? 'Sé el primero en comentar.' : 'Inicia sesión para comentar.'}</div>
        )}

        {topLevel.map(c => {
          const replies = repliesByParent[c.id] || [];
          const showAll = expanded[c.id];
          const visible = showAll ? replies : replies.slice(0, 3);
          const hidden = replies.length - 3;

          return (
            <div key={c.id} className="border border-foxBrown/15 rounded p-3">
              <CommentItem c={c} bookId={bookId} onDelete={remove} onReply={load}
                           replyOpen={replyOpen} setReplyOpen={setReplyOpen} />

              {replies.length > 0 && (
                <div className="ml-6 mt-2 pl-3 border-l-2 border-amber-300/40 dark:border-amber-600/40 space-y-2">
                  {visible.map(r => (
                    <CommentItem key={r.id} c={r} bookId={bookId} onDelete={remove}
                                 onReply={load} replyOpen={replyOpen} setReplyOpen={setReplyOpen} />
                  ))}
                  {hidden > 0 && (
                    <button className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                            onClick={() => toggleExpand(c.id)}>
                      {showAll
                        ? 'Mostrar menos'
                        : `Mostrar las ${replies.length - 3} respuestas restantes`
                      }
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
