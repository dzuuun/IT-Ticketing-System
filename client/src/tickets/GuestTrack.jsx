import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaCountdown from '../components/SlaCountdown';

export default function GuestTrack() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useParams();

  const [ticketNumber, setTicketNumber] = useState(searchParams.get('ticket') || '');
  const [trackingCode, setTrackingCode] = useState(searchParams.get('code') || '');
  const [email, setEmail] = useState('');
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [sendingReply, setSendingReply] = useState(false);

  // Resolution confirmation state
  const [rating, setRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [confirmingResolution, setConfirmingResolution] = useState(false);

  const fetchTicket = async (tNum, tCode, tEmail) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/tickets/guest-track', {
        ticket_number: tNum,
        tracking_code: tCode || undefined,
        email: tEmail || undefined,
      });

      if (res.data.success) {
        setTicket(res.data.ticket);
        setMessages(res.data.messages || []);
        setAttachments(res.data.attachments || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ticket not found or credentials do not match.');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecureGuestTicket = async (guestToken) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/guest/tickets/${guestToken}`);
      if (res.data.success) {
        setTicket(res.data.ticket);
        setMessages(res.data.messages || []);
        setAttachments(res.data.attachments || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'This guest ticket link is invalid or has expired.');
      setTicket(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (token) { fetchSecureGuestTicket(token); return; }
    const qTicket = searchParams.get('ticket');
    const qCode = searchParams.get('code');
    if (qTicket && qCode) {
      setTicketNumber(qTicket);
      setTrackingCode(qCode);
      fetchTicket(qTicket, qCode, null);
    }
  }, [searchParams, token]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!ticketNumber) return;
    fetchTicket(ticketNumber, trackingCode, email);
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !ticket) return;

    setSendingReply(true);
    try {
      if (!token) throw new Error('Use the secure guest link from your ticket acknowledgement to reply.');
      const formData = new FormData();
      formData.append('message', replyText);
      replyFiles.forEach((f) => formData.append('attachments', f));
      await api.post(`/guest/tickets/${token}/replies`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      setReplyText('');
      setReplyFiles([]);
      // Reload ticket
      fetchSecureGuestTicket(token);
    } catch (err) {
      alert('Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolutionAction = async (action) => {
    if (!ticket) return;
    setConfirmingResolution(true);
    try {
      await api.post(token ? `/guest/tickets/${token}/resolution` : `/tickets/${ticket.id}/confirm-resolution`, {
        action,
        rating,
        rating_feedback: ratingFeedback,
        comment: reopenReason,
      });
      if (token) fetchSecureGuestTicket(token); else fetchTicket(ticket.ticket_number, ticket.tracking_code, null);
    } catch (err) {
      alert('Failed to process resolution action.');
    } finally {
      setConfirmingResolution(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold text-ndmu-green-700 hover:underline mb-2">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Track Ticket Status</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {token ? 'Your secure guest ticket link.' : 'Look up your request using your Ticket Reference Number (e.g. MIS-2026-000124)'}
        </p>
      </div>

      {/* Search Box */}
      {!token && <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ticket Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. MIS-2026-000124"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tracking Code
            </label>
            <input
              type="text"
              placeholder="e.g. NDMU-TRK-XXXX"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-ndmu-green-800 hover:bg-ndmu-green-700 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">search</span>
              )}
              Track Ticket
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}
      </div>}

      {/* Ticket Result Details */}
      {ticket && (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-extrabold text-ndmu-green-800">{ticket.ticket_number}</span>
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{ticket.title}</h2>
              </div>

              <div className="text-right">
                <SlaCountdown targetDate={ticket.sla_due_resolution} isCompleted={ticket.status === 'resolved' || ticket.status === 'closed'} />
                <div className="text-[11px] text-slate-400 mt-1">
                  Submitted on {new Date(ticket.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block font-medium">Requestor</span>
                <span className="font-bold text-slate-800">{ticket.requestor_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Category</span>
                <span className="font-bold text-slate-800">{ticket.category_name || 'General'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Assigned Technician</span>
                <span className="font-bold text-slate-800">{ticket.assigned_technician_name || 'In Triage Queue'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Office / Location</span>
                <span className="font-bold text-slate-800">{ticket.location_office || 'Not specified'}</span>
              </div>
            </div>

            {/* Custom fields if present */}
            {ticket.custom_fields && (
              <div className="mb-6 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div className="text-xs font-bold text-ndmu-green-900 mb-2 uppercase tracking-wider">
                  Service Request Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(
                    typeof ticket.custom_fields === 'string'
                      ? JSON.parse(ticket.custom_fields || '{}')
                      : ticket.custom_fields
                  ).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="font-semibold text-slate-600 capitalize">{k.replace('_', ' ')}:</span>
                      <span className="text-slate-900">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Box if resolved */}
            {ticket.status === 'resolved' && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-sm mb-2">
                  <span className="material-symbols-outlined text-lg text-teal-700">task_alt</span>
                  <span>Technician Resolution Notes</span>
                </div>
                <p className="text-xs text-teal-900 whitespace-pre-wrap bg-white p-3 rounded-lg border border-teal-100 mb-4">
                  {ticket.resolution_notes || 'The technician has marked this request as resolved.'}
                </p>

                <div className="pt-3 border-t border-teal-200">
                  <div className="text-xs font-bold text-teal-900 mb-3">Please confirm if the issue is solved:</div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-600 font-medium">Rating:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`material-symbols-outlined text-[20px] ${star <= rating ? 'text-amber-400' : 'text-slate-300'}`}
                        >
                          star
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleResolutionAction('confirm')}
                      disabled={confirmingResolution}
                      className="px-4 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Confirm Resolution & Close
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Please explain why the issue is not resolved:');
                        if (reason) {
                          setReopenReason(reason);
                          handleResolutionAction('reopen');
                        }
                      }}
                      disabled={confirmingResolution}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Reopen Ticket
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Conversation History
              </h3>

              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl text-xs ${
                      msg.sender_role === 'technician' || msg.sender_role === 'admin'
                        ? 'bg-slate-100 border border-slate-200 ml-4'
                        : 'bg-emerald-50 border border-emerald-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 font-semibold">
                      <span className={msg.sender_role === 'technician' ? 'text-blue-800' : 'text-ndmu-green-900'}>
                        {msg.sender_name} ({msg.sender_role})
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              {ticket.status !== 'closed' && (
                <form onSubmit={handlePostReply} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <textarea
                    required
                    rows={3}
                    placeholder="Reply or provide additional details..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setReplyFiles(Array.from(e.target.files || []))}
                      className="text-[11px] text-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply}
                      className="px-4 py-2 bg-ndmu-green-800 hover:bg-ndmu-green-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      Send Reply
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
