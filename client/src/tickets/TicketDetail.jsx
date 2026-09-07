import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaCountdown from '../components/SlaCountdown';
import Modal from '../components/Modal';

export default function TicketDetail() {
  const { identifier } = useParams();
  const { user, isStaff, isAdmin, isTeamLeader } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Message compose
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [replyFiles, setReplyFiles] = useState([]);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Triage / Action Modals
  const [triageModalOpen, setTriageModalOpen] = useState(false);
  const [triagePriority, setTriagePriority] = useState('');
  const [triageCategory, setTriageCategory] = useState('');
  const [triageTech, setTriageTech] = useState('');
  const [triageType, setTriageType] = useState('');
  const [triageNote, setTriageNote] = useState('');

  // Resolution modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [resolving, setResolving] = useState(false);

  // Requestor Resolution Confirmation
  const [rating, setRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [confirming, setConfirming] = useState(false);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/tickets/${identifier}`);
      if (res.data.success) {
        setTicket(res.data.ticket);
        setMessages(res.data.messages || []);
        setAttachments(res.data.attachments || []);
        setActivityLogs(res.data.activityLogs || []);

        setTriagePriority(res.data.ticket.priority);
        setTriageCategory(res.data.ticket.category_id || '');
        setTriageTech(res.data.ticket.assigned_technician_id || '');
        setTriageType(res.data.ticket.ticket_type);
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();

    if (isStaff) {
      api.get('/users/technicians').then((res) => {
        if (res.data.success) setTechnicians(res.data.technicians);
      }).catch(() => {});

      api.get('/categories').then((res) => {
        if (res.data.success) setCategories(res.data.categories);
      }).catch(() => {});
    }
  }, [identifier, isStaff]);

  const handlePostMessage = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !ticket) return;

    setSubmittingReply(true);
    try {
      const formData = new FormData();
      formData.append('message', replyMessage);
      formData.append('is_internal', isInternalNote);
      replyFiles.forEach((f) => formData.append('attachments', f));

      await api.post(`/tickets/${ticket.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setReplyMessage('');
      setIsInternalNote(false);
      setReplyFiles([]);
      fetchTicket();
    } catch (err) {
      alert('Failed to post message.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!ticket) return;
    try {
      await api.patch(`/tickets/${ticket.id}/status`, { status: newStatus });
      fetchTicket();
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleTriageSubmit = async (e) => {
    e.preventDefault();
    if (!ticket) return;
    try {
      await api.patch(`/tickets/${ticket.id}/triage`, {
        priority: triagePriority,
        category_id: triageCategory,
        assigned_technician_id: triageTech || null,
        ticket_type: triageType,
        internal_notes: triageNote || undefined,
      });
      setTriageModalOpen(false);
      setTriageNote('');
      fetchTicket();
    } catch (err) {
      alert('Failed to triage ticket.');
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionText.trim() || !ticket) return;

    setResolving(true);
    try {
      await api.post(`/tickets/${ticket.id}/resolve`, {
        resolution_notes: resolutionText.trim(),
      });
      setResolveModalOpen(false);
      setResolutionText('');
      fetchTicket();
    } catch (err) {
      alert('Failed to record resolution.');
    } finally {
      setResolving(false);
    }
  };

  const handleResolutionConfirmation = async (action) => {
    if (!ticket) return;
    setConfirming(true);
    try {
      let reopenReason = '';
      if (action === 'reopen') {
        reopenReason = prompt('Please explain why the issue persists:') || 'Issue not resolved';
      }
      await api.post(`/tickets/${ticket.id}/confirm-resolution`, {
        action,
        rating,
        rating_feedback: ratingFeedback,
        comment: reopenReason,
      });
      fetchTicket();
    } catch (err) {
      alert('Failed to update resolution confirmation.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ndmu-green-700"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Ticket Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">The requested ticket does not exist or you do not have permission to view it.</p>
        <Link to="/" className="px-4 py-2 bg-ndmu-green-800 text-white rounded-lg text-xs font-semibold">
          Return Home
        </Link>
      </div>
    );
  }

  const statuses = ['new', 'assigned', 'in_progress', 'pending_user', 'resolved', 'closed'];
  const currentStatusIndex = statuses.indexOf(ticket.status);

  return (
    <main className="min-h-full space-y-4 bg-[#f4f7f5] p-4 sm:p-5 lg:p-6">
      {/* Top Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <Link
            to={isStaff ? '/staff/dashboard' : '/my-tickets'}
            className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-ndmu-green-700 hover:text-ndmu-green-900"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            {isStaff ? 'Back to ICT-MIS Queues' : 'Back to My Requests'}
          </Link>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Ticket workspace</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-medium tracking-tight text-slate-900">{ticket.ticket_number}</h1>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
              ticket.ticket_type === 'incident' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {ticket.ticket_type === 'incident' ? 'Incident' : 'Service Request'}
            </span>
          </div>
        </div>

        {/* Staff Action Controls */}
        {isStaff && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTriageModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-700"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Triage / Assign
            </button>

            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <button
                onClick={() => setResolveModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600"
              >
                <span className="material-symbols-outlined text-[16px]">task_alt</span>
                Resolve Ticket
              </button>
            )}

            {/* Quick Status Dropdown */}
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-ndmu-green-500"
            >
              <option value="new">Status: New</option>
              <option value="assigned">Status: Assigned</option>
              <option value="in_progress">Status: In Progress</option>
              <option value="pending_user">Status: Pending Requestor</option>
              <option value="resolved">Status: Resolved</option>
              <option value="closed">Status: Closed</option>
            </select>
          </div>
        )}
      </div>

      {/* Status Progress Stepper */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between min-w-[600px] text-xs font-semibold">
          {statuses.map((st, idx) => {
            const isDone = idx <= currentStatusIndex;
            const isCurrent = idx === currentStatusIndex;
            return (
              <div key={st} className="flex-1 flex items-center last:flex-none">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                      isCurrent
                        ? 'bg-ndmu-green-800 text-white ring-4 ring-ndmu-green-100'
                        : isDone
                        ? 'bg-ndmu-green-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isDone ? <span className="material-symbols-outlined text-[14px]">check</span> : idx + 1}
                  </div>
                  <span className={`capitalize ${isCurrent ? 'font-bold text-ndmu-green-900' : 'text-slate-500'}`}>
                    {st.replace('_', ' ')}
                  </span>
                </div>
                {idx < statuses.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-3 rounded ${
                      idx < currentStatusIndex ? 'bg-ndmu-green-600' : 'bg-slate-200'
                    }`}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Conversation, Right Details */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left 2 Columns: Subject, Custom fields, Messages, Reply */}
        <div className="space-y-4">
          {/* Ticket Header & Description Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-ndmu-green-700">Request summary</p>
            <h2 className="mb-3 mt-1 font-display text-xl font-medium text-slate-900">{ticket.title}</h2>
            <div className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-700">
              {ticket.description}
            </div>

            {/* Custom Form Fields Breakdown */}
            {ticket.custom_fields && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-ndmu-green-700">tune</span>
                  Service Specific Answers
                </div>
                <div className="grid grid-cols-1 gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 text-xs sm:grid-cols-2">
                  {Object.entries(
                    typeof ticket.custom_fields === 'string'
                      ? JSON.parse(ticket.custom_fields || '{}')
                      : ticket.custom_fields
                  ).map(([k, v]) => (
                    <div key={k}>
                      <span className="font-semibold text-slate-500 capitalize">{k.replace('_', ' ')}: </span>
                      <span className="font-bold text-slate-800">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Attachments ({attachments.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">attachment</span>
                      <span className="truncate max-w-[150px]">{att.original_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Requestor Resolution Confirmation Banner if Resolved */}
          {ticket.status === 'resolved' && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm mb-2">
                <span className="material-symbols-outlined text-xl text-teal-700">verified</span>
                Resolution Details
              </div>
              <p className="text-xs text-teal-950 whitespace-pre-wrap bg-white p-3 rounded-xl border border-teal-100 mb-4">
                {ticket.resolution_notes}
              </p>

              <div className="pt-3 border-t border-teal-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-teal-900">Rate Service:</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`material-symbols-outlined text-[20px] ${
                          star <= rating ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        star
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolutionConfirmation('confirm')}
                    disabled={confirming}
                    className="px-4 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                  >
                    Confirm & Close Ticket
                  </button>
                  <button
                    onClick={() => handleResolutionConfirmation('reopen')}
                    disabled={confirming}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Issue Not Fixed (Reopen)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conversation Stream */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-ndmu-green-700">
              Communication & Updates
            </h3>

            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl border p-3.5 text-xs shadow-sm transition-all ${
                    msg.is_internal
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950 ring-1 ring-amber-200'
                      : msg.sender_role === 'technician' || msg.sender_role === 'admin'
                      ? 'bg-blue-50/70 border-blue-200 text-slate-800 ml-4 sm:ml-8'
                      : 'bg-white border-slate-200 text-slate-800 mr-4 sm:mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{msg.sender_name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          msg.sender_role === 'admin' || msg.sender_role === 'technician'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {msg.sender_role}
                      </span>
                      {msg.is_internal ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          Internal Staff Note
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Compose Reply Form */}
            {ticket.status !== 'closed' && (
              <form
                onSubmit={handlePostMessage}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Add Reply / Update
                  </span>
                  {isStaff && (
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Private Internal Note (ICT-MIS Staff Only)</span>
                    </label>
                  )}
                </div>

                <textarea
                  required
                  rows={3}
                  placeholder={
                    isInternalNote
                      ? 'Type internal diagnosis, technician notes, or handover comments...'
                      : 'Type your reply to the requestor...'
                  }
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:ring-2 focus:outline-none ${
                    isInternalNote
                      ? 'bg-amber-50/50 border-amber-300 focus:ring-amber-500 text-amber-950'
                      : 'bg-white border-slate-300 focus:ring-ndmu-green-500 text-slate-800'
                  }`}
                />

                <div className="flex items-center justify-between">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setReplyFiles(Array.from(e.target.files || []))}
                    className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 hover:file:bg-slate-200"
                  />
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${
                      isInternalNote ? 'bg-amber-700 hover:bg-amber-600' : 'bg-ndmu-green-800 hover:bg-ndmu-green-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    {isInternalNote ? 'Save Internal Note' : 'Send Public Reply'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Meta & Audit Log */}
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          {/* Metadata Card */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
              Ticket Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">SLA Resolution Target</span>
                <SlaCountdown targetDate={ticket.sla_due_resolution} isCompleted={ticket.status === 'resolved' || ticket.status === 'closed'} />
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Category</span>
                <span className="font-bold text-slate-800">{ticket.category_name || 'General'}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Assigned Technician</span>
                <span className="font-bold text-slate-800">{ticket.assigned_technician_name || 'Unassigned'}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Requestor Name</span>
                <span className="font-bold text-slate-800">{ticket.requestor_name}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Requestor Email</span>
                <span className="font-bold text-slate-800">{ticket.requestor_email}</span>
              </div>

              {ticket.requestor_department && (
                <div>
                  <span className="text-slate-400 block font-medium">College / Department</span>
                  <span className="font-bold text-slate-800">{ticket.requestor_department}</span>
                </div>
              )}

              {ticket.location_office && (
                <div>
                  <span className="text-slate-400 block font-medium">Location</span>
                  <span className="font-bold text-slate-800">{ticket.location_office}</span>
                </div>
              )}

              <div>
                <span className="text-slate-400 block font-medium">Tracking Code</span>
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                  {ticket.tracking_code}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Logs (Staff Only) */}
          {isStaff && activityLogs.length > 0 && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-500">history</span>
                Audit Trail
              </h3>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {activityLogs.map((log) => (
                  <div key={log.id} className="text-[11px] border-l-2 border-ndmu-green-700 pl-3 py-0.5">
                    <div className="font-bold text-slate-800">{log.action_type}: {log.comment || `${log.old_value} → ${log.new_value}`}</div>
                    <div className="text-[10px] text-slate-400">
                      By {log.actor_name} &bull; {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Triage / Assignment Modal */}
      <Modal isOpen={triageModalOpen} onClose={() => setTriageModalOpen(false)} title={`Triage Ticket #${ticket.ticket_number}`}>
        <form onSubmit={handleTriageSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ticket Type</label>
            <select
              value={triageType}
              onChange={(e) => setTriageType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="service_request">Service Request</option>
              <option value="incident">Incident</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Priority</label>
            <select
              value={triagePriority}
              onChange={(e) => setTriagePriority(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="low">Low (72h SLA)</option>
              <option value="medium">Medium (24h SLA)</option>
              <option value="high">High (12h SLA)</option>
              <option value="urgent">Urgent (8h SLA)</option>
              <option value="critical">Critical (4h SLA)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={triageCategory}
              onChange={(e) => setTriageCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assign Technician</label>
            <select
              value={triageTech}
              onChange={(e) => setTriageTech(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="">-- Unassigned (Triage Queue) --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name} ({t.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Internal Triage Note (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Assigned to hardware tech for urgent lab check."
              value={triageNote}
              onChange={(e) => setTriageNote(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTriageModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-ndmu-green-800 hover:bg-ndmu-green-700 text-white font-bold rounded-lg"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Resolve Modal */}
      <Modal isOpen={resolveModalOpen} onClose={() => setResolveModalOpen(false)} title={`Resolve Ticket #${ticket.ticket_number}`}>
        <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Resolution Notes <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Explain the actions performed, cause of the issue, or credentials provisioned. This will be sent to the requestor.
            </p>
            <textarea
              required
              rows={4}
              placeholder="e.g. Replaced damaged RJ45 connector, verified 1 Gbps LAN link, and tested connectivity with requestor."
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResolveModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resolving}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-lg shadow-sm"
            >
              {resolving ? 'Recording...' : 'Mark as Resolved'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
