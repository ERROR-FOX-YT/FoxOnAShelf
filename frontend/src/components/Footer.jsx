import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Footer() {
  const [info, setInfo] = useState('');
  const [changelogCfg, setChangelogCfg] = useState(null);

  useEffect(() => {
    api.get('/api/moderation/contact-info')
      .then(j => setInfo(j.contact_info || 'Discord oficial: https://discord.gg/j543pdNhae'))
      .catch(() => setInfo('Discord oficial: https://discord.gg/j543pdNhae'));
    api.get('/api/changelogs/config')
      .then(setChangelogCfg)
      .catch(() => {});
  }, []);

  return (
    <footer className="mt-12 border-t border-bookshelfBrown/15 bg-parchment/60 dark:bg-nightGray/60">
      <div className="max-w-6xl mx-auto px-4 py-6 text-xs flex flex-col md:flex-row gap-3 justify-between">
        <div>
          <Link to="/team" className="hover:underline">
            <strong>BookShelf™</strong> — Plataforma de lectura digital
          </Link>
          <div className="opacity-80">© 2026 Jeison Sossa, Santiago López, Leyder Montoya. Todos los derechos reservados.</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="opacity-80 break-words max-w-md whitespace-pre-line">{info}</div>
          {changelogCfg && (
            <Link to="/changelog" className="underline opacity-80 hover:opacity-100 transition-opacity">
              {changelogCfg.current_version} — {changelogCfg.link_text}
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
