import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

type SupportMessage = { _id: string; senderRole: 'user' | 'admin'; message: string; createdAt: string };

export const SupportChatPage: React.FC = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const result = await api.getSupportMessages();
      setMessages(result.messages || []);
      setError('');
    } catch (cause: any) { setError(cause.message || 'Could not load your conversation.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(), 8000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      await api.sendSupportMessage(message);
      setDraft('');
      await loadMessages();
      toast.success('Your message was sent to the admin team.');
    } catch (cause: any) { setError(cause.message || 'Could not send your message.'); }
    finally { setSending(false); }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-700"><MessageCircle className="h-5 w-5" /></span><div><h1 className="text-xl font-bold text-slate-900">Queries & Issues</h1><p className="mt-1 text-sm text-slate-500">Chat privately with the portal admin team.</p></div></div></header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-6" aria-live="polite">
          {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading conversation…</p> : messages.length === 0 ? <div className="py-16 text-center"><MessageCircle className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Ask a question or report an issue</p><p className="mt-1 text-xs text-slate-500">Only you and the admin team can see this conversation.</p></div> : messages.map((item) => <div key={item._id} className={`flex ${item.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}><article className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${item.senderRole === 'user' ? 'rounded-br-md bg-rose-700 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'}`}><p className="whitespace-pre-wrap break-words text-sm">{item.message}</p><time className={`mt-2 block text-[10px] ${item.senderRole === 'user' ? 'text-rose-100' : 'text-slate-400'}`}>{item.senderRole === 'user' ? 'You' : 'Admin'} · {new Date(item.createdAt).toLocaleString()}</time></article></div>)}
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}<div ref={bottomRef} />
        </div>
        <form onSubmit={submit} className="flex items-end gap-3 border-t border-slate-100 p-4 sm:p-5"><label className="sr-only" htmlFor="support-message">Your message</label><textarea id="support-message" required maxLength={2000} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type your question or issue…" className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" /><button disabled={sending || !draft.trim()} className="inline-flex h-12 items-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{sending ? 'Sending' : 'Send'}</button></form>
      </section>
    </main>
  );
};
