import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Footer() {
  const [info, setInfo] = useState('');

  useEffect(() => {
    // Información y contactos del admin principal
    fetch('/api/users/22222222-2222-2222-2222-222222222222')
      .then(r => r.json())
      .then(j => setInfo((j.user && j.user.contact_info) ||
        'Discord oficial: https://discord.gg/j543pdNhae'))
      .catch(() => setInfo('Discord oficial: https://discord.gg/j543pdNhae'));
  }, []);

  return (
    <footer className="mt-12 border-t border-bookedBrown/15 bg-parchment/60 dark:bg-nightGray/60">
      <div className="max-w-6xl mx-auto px-4 py-6 text-xs flex flex-col md:flex-row gap-3 justify-between">
        <div>
          <strong>Booked™</strong> — Plataforma de lectura digital
          <div className="opacity-80">© 2026 Jeison Sossa, Santiago López, Leyder Montoya. Todos los derechos reservados.</div>
        </div>
        <div className="opacity-80 break-words max-w-md whitespace-pre-line">{info}</div>
      </div>
    </footer>
  );
}
