import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { MessageCircle, RefreshCw, Send, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

type Conversation = {
  user: { _id: string; name: string; googleEmail: string };
  lastMessage: { message: string; senderRole: string; createdAt: string };
  unreadCount: number;
};
type SupportMessage = { _id: string; senderRole: 'user' | 'admin'; message: string; createdAt: string };

export const AdminSupportInbox: React.FC<{ onUnreadCountChange?: (count: number) => void }> = ({ onUnreadCountChange }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    try {
      const result = await api.getSupportConversationsAdmin();
      const nextConversations = result.conversations || [];
      setConversations(nextConversations);
      onUnreadCountChange?.(nextConversations.reduce((count: number, conversation: Conversation) => count + (conversation.unreadCount || 0), 0));
      setError('');
    } catch (cause: any) { setError(cause.message || 'Could not load support conversations.'); }
    finally { setLoading(false); }
  }, [onUnreadCountChange]);

  const loadMessages = useCallback(async (userId: string) => {
    try {
      const result = await api.getSupportConversationAdmin(userId);
      setMessages(result.messages || []);
    } catch (cause: any) { setError(cause.message || 'Could not load this conversation.'); }
  }, []);

  useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => void loadConversations(), 15000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    void loadMessages(selected.user._id);
    const timer = window.setInterval(() => void loadMessages(selected.user._id), 10000);
    return () => window.clearInterval(timer);
  }, [selected, loadMessages]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    try {
      await api.sendSupportReplyAdmin(selected.user._id, draft.trim());
      setDraft('');
      await Promise.all([loadMessages(selected.user._id), loadConversations()]);
    } catch (cause: any) { setError(cause.message || 'Could not send the reply.'); }
    finally { setSending(false); }
  };

  const deleteConversation = async () => {
    if (!selected || deleting) return;
    setDeleting(true);
    try {
      await api.deleteSupportConversationAdmin(selected.user._id);
      setDeleteModalOpen(false);
      setSelected(null);
      setMessages([]);
      await loadConversations();
    } catch (cause: any) { setError(cause.message || 'Could not delete this conversation.'); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <section className="grid min-h-[65vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div><h2 className="font-semibold text-slate-900">User conversations</h2><p className="text-xs text-slate-500">Private support queries</p></div>
            <button type="button" onClick={() => void loadConversations()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Refresh conversations"><RefreshCw className="h-4 w-4" /></button>
          </div>
          <div className="max-h-[65vh] overflow-y-auto">
            {loading ? <p className="p-5 text-sm text-slate-500">Loading inbox...</p> : conversations.map((conversation) => <button type="button" key={conversation.user._id} onClick={() => setSelected(conversation)} className={`w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 ${selected?.user._id === conversation.user._id ? 'bg-rose-50' : ''}`}>
              <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-900">{conversation.user.name}</span>{conversation.unreadCount > 0 && <span className="rounded-full bg-rose-700 px-2 py-0.5 text-[10px] font-bold text-white">{conversation.unreadCount}</span>}</div>
              <p className="truncate text-[11px] text-slate-500">{conversation.user.googleEmail}</p>
              <p className="mt-2 truncate text-xs text-slate-600">{conversation.lastMessage.senderRole === 'admin' ? 'You: ' : ''}{conversation.lastMessage.message}</p>
              <time className="mt-1 block text-[10px] text-slate-400">{new Date(conversation.lastMessage.createdAt).toLocaleString()}</time>
            </button>)}
            {!loading && !conversations.length && <p className="p-6 text-center text-sm text-slate-500">No user messages yet.</p>}
          </div>
        </aside>

        <div className="flex min-h-[65vh] flex-col">
          {selected ? <>
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div><h3 className="font-semibold text-slate-900">{selected.user.name}</h3><p className="text-xs text-slate-500">{selected.user.googleEmail}</p></div>
              <button type="button" onClick={() => setDeleteModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50" aria-label="Delete support conversation"><Trash2 className="h-4 w-4" />Delete conversation</button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
              {messages.map((item) => <div key={item._id} className={`flex ${item.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}><article className={`max-w-[85%] rounded-2xl px-4 py-3 ${item.senderRole === 'admin' ? 'rounded-br-md bg-slate-900 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'}`}><p className="whitespace-pre-wrap break-words text-sm">{item.message}</p><time className="mt-2 block text-[10px] opacity-70">{item.senderRole === 'admin' ? 'Admin' : 'User'} · {new Date(item.createdAt).toLocaleString()}</time></article></div>)}
              {!messages.length && <p className="py-10 text-center text-sm text-slate-500">No messages in this conversation.</p>}
            </div>
            <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-100 p-4">
              <label className="sr-only" htmlFor="admin-support-reply">Reply to user</label>
              <textarea id="admin-support-reply" rows={2} maxLength={2000} required value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a reply..." className="flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-rose-400" />
              <button disabled={sending || !draft.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />{sending ? 'Sending' : 'Reply'}</button>
            </form>
          </> : <div className="grid flex-1 place-items-center p-8 text-center"><div><MessageCircle className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Select a conversation</p><p className="mt-1 text-sm text-slate-500">Messages from portal users will appear here.</p></div></div>}
          {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
        </div>
      </section>

      <Modal isOpen={deleteModalOpen} onClose={() => !deleting && setDeleteModalOpen(false)} title="Delete support conversation">
        {selected && <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">Permanently delete the entire support conversation with <strong className="text-slate-900">{selected.user.name}</strong>? All messages will be removed for both the user and admin. This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteModalOpen(false)} disabled={deleting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void deleteConversation()} disabled={deleting} className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete permanently'}</button>
          </div>
        </div>}
      </Modal>
    </>
  );
};
