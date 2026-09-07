import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DynamicFormFields from '../components/DynamicFormFields';

export default function SubmitTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGuestModeParam = searchParams.get('guest') === 'true';

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState(searchParams.get('cat') || '');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [ticketType, setTicketType] = useState('service_request'); // 'service_request' | 'incident'
  const [title, setTitle] = useState('');
  const [autoFilledTitle, setAutoFilledTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationOffice, setLocationOffice] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [attachments, setAttachments] = useState([]);

  // Guest fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestDepartment, setGuestDepartment] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, deptRes] = await Promise.all([
          api.get('/categories'),
          api.get('/departments'),
        ]);
        if (catRes.data.success) {
          setCategories(catRes.data.categories);
          if (searchParams.get('cat')) {
            setSelectedCategoryId(searchParams.get('cat'));
          } else if (catRes.data.categories.length > 0) {
            setSelectedCategoryId(String(catRes.data.categories[0].id));
          }
        }
        if (deptRes.data.success) {
          setDepartments(deptRes.data.departments);
        }
      } catch (err) {
        console.error('Failed to load form metadata:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [searchParams]);

  // Current category and subcategories
  const currentCategory = categories.find((c) => String(c.id) === String(selectedCategoryId));
  const currentSubcategory = currentCategory?.subcategories?.find(
    (s) => String(s.id) === String(selectedSubcategoryId)
  );
  let currentFormSchema = currentSubcategory?.form_schema || [];
  if (typeof currentFormSchema === 'string') {
    try {
      currentFormSchema = JSON.parse(currentFormSchema);
    } catch {
      currentFormSchema = [];
    }
  }
  const hasServiceFields = Array.isArray(currentFormSchema) && currentFormSchema.length > 0;

  // When subcategory changes, update default type and reset custom field values
  const handleCategorySelect = (categoryId) => {
    setSelectedCategoryId(String(categoryId));
    setSelectedSubcategoryId('');
    setCustomFieldValues({});
    if (!title.trim() || title === autoFilledTitle) {
      setTitle('');
      setAutoFilledTitle('');
    }
  };

  const handleSubcategorySelect = (subId) => {
    setSelectedSubcategoryId(subId);
    const sub = currentCategory?.subcategories?.find((s) => String(s.id) === String(subId));
    if (sub) {
      setTicketType(sub.default_type || 'service_request');
      if (!title.trim() || title === autoFilledTitle) {
        setTitle(sub.name);
        setAutoFilledTitle(sub.name);
      }
      setCustomFieldValues({});
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category_id', selectedCategoryId);
      if (selectedSubcategoryId) formData.append('subcategory_id', selectedSubcategoryId);
      formData.append('ticket_type', ticketType);
      formData.append('location_office', locationOffice);
      formData.append('custom_fields', JSON.stringify(customFieldValues));

      if (!user) {
        formData.append('requestor_name', guestName);
        formData.append('requestor_email', guestEmail);
        formData.append('requestor_phone', guestPhone);
        formData.append('requestor_department', guestDepartment);
      }

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await api.post('/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setSuccessData(res.data.ticket);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit ticket. Please check all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ndmu-green-700"></div>
      </div>
    );
  }

  // Success Confirmation Screen
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl font-bold">check_circle</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1">Ticket Submitted Successfully!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Your request has been logged into the NDMU ICT-MIS Service Desk.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto mb-8 space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Ticket Number</span>
              <span className="text-base font-extrabold text-ndmu-green-800">{successData.ticket_number}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Tracking Code</span>
              <span className="text-sm font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border">
                {successData.tracking_code}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Subject</span>
              <span className="text-xs font-bold text-slate-800 text-right truncate max-w-[200px]">{successData.title}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(successData.guest_token ? `/guest/ticket/${successData.guest_token}` : `/tickets/${successData.ticket_number}`)}
              className="w-full sm:w-auto px-6 py-2.5 bg-ndmu-green-800 hover:bg-ndmu-green-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
            >
              View Ticket Details
            </button>
            <button
              onClick={() => {
                setSuccessData(null);
                setTitle('');
                setAutoFilledTitle('');
                setDescription('');
                setCustomFieldValues({});
                setAttachments([]);
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-ndmu-green-700 transition-colors hover:text-ndmu-green-900">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Service Desk
          </Link>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ndmu-green-700">New support ticket</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">How can ICT-MIS help?</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Choose a service, describe what you need, and include any details that can help us respond faster.</p>
        </div>
        <div className="inline-flex max-w-full items-center gap-3 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:self-auto">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ndmu-green-50 text-ndmu-green-700">
            <span className="material-symbols-outlined text-xl">{user ? 'verified_user' : 'person'}</span>
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitting as</p>
            <p className="truncate text-xs font-bold text-slate-800">{user ? user.full_name : 'Guest requestor'}</p>
            {user && <p className="truncate text-[11px] text-slate-500">{user.email}</p>}
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-5">
          {!user && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-ndmu-green-50 text-ndmu-green-700">
                  <span className="material-symbols-outlined text-xl">person</span>
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ndmu-green-700">Requestor details</p>
                  <h2 className="text-base font-extrabold text-slate-900">How can we reach you?</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Full name <span className="text-rose-500">*</span></label>
                  <input type="text" required autoComplete="name" placeholder="e.g. Maria Clara" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Contact email <span className="text-rose-500">*</span></label>
                  <input type="email" required autoComplete="email" placeholder="name@example.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Department / College</label>
                  <select value={guestDepartment} onChange={(e) => setGuestDepartment(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100">
                    <option value="">Select a department</option>
                    {departments.map((d) => <option key={d.id} value={d.name}>{d.name} ({d.code})</option>)}
                    <option value="Guest / Visitor">Guest / Visitor</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Mobile / Contact number</label>
                  <input type="tel" autoComplete="tel" placeholder="e.g. 0917 123 4567" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100" />
                </div>
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-ndmu-green-700 text-sm font-black text-white">1</span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ndmu-green-700">Service catalog</p>
                <h2 className="text-base font-extrabold text-slate-900">Choose the service you need</h2>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <p className="mb-3 text-xs font-bold text-slate-600">Category</p>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
                {categories.map((cat) => {
                  const selected = String(selectedCategoryId) === String(cat.id);
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      aria-pressed={selected}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`group min-h-20 rounded-xl border p-3 text-left transition-all ${selected ? 'border-ndmu-green-600 bg-ndmu-green-50 ring-2 ring-ndmu-green-600/15' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-ndmu-green-300 hover:shadow-sm'}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className={`grid h-8 w-8 place-items-center rounded-lg ${selected ? 'bg-ndmu-green-700 text-white' : 'bg-slate-100 text-ndmu-green-700 group-hover:bg-ndmu-green-50'}`}>
                          <span className="material-symbols-outlined text-lg">{cat.icon || 'category'}</span>
                        </span>
                        {selected && <span className="material-symbols-outlined text-lg text-ndmu-green-700">check_circle</span>}
                      </span>
                      <span className={`mt-2 block text-xs font-bold leading-4 ${selected ? 'text-ndmu-green-900' : 'text-slate-700'}`}>{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              {currentCategory?.subcategories?.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-700">Specific service or problem</p>
                    <p className="text-[11px] text-slate-400">Select one item</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {currentCategory.subcategories.map((sub) => {
                      const selected = String(selectedSubcategoryId) === String(sub.id);
                      const incident = sub.default_type === 'incident';
                      return (
                        <button type="button" key={sub.id} aria-pressed={selected} onClick={() => handleSubcategorySelect(String(sub.id))} className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${selected ? 'border-ndmu-green-600 bg-ndmu-green-50 ring-2 ring-ndmu-green-600/15' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className={`material-symbols-outlined text-lg ${selected ? 'text-ndmu-green-700' : 'text-slate-400'}`}>{selected ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                            <span className="text-xs font-semibold text-slate-800">{sub.name}</span>
                          </span>
                          <span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${incident ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{incident ? 'Incident' : 'Request'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {hasServiceFields && (
            <DynamicFormFields schema={currentFormSchema} values={customFieldValues} onChange={setCustomFieldValues} />
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-ndmu-green-700 text-sm font-black text-white">{hasServiceFields ? '3' : '2'}</span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ndmu-green-700">Request details</p>
                <h2 className="text-base font-extrabold text-slate-900">Tell us what happened</h2>
              </div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Subject / Title <span className="text-rose-500">*</span></label>
                <input type="text" required maxLength={255} placeholder="A short summary of the request or problem" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100" />
                <p className="mt-1 text-right text-[10px] text-slate-400">{title.length}/255</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Detailed description <span className="text-rose-500">*</span></label>
                <textarea required rows={5} placeholder="Include what you were trying to do, what went wrong, and any error messages you saw." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-6 outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Location / Building / Office</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">location_on</span>
                  <input type="text" placeholder="e.g. CCS Building, Room 204" value={locationOffice} onChange={(e) => setLocationOffice(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Attachments <span className="font-normal text-slate-400">(optional)</span></label>
                <label htmlFor="ticket-attachments" className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center transition hover:border-ndmu-green-500 hover:bg-ndmu-green-50/50">
                  <span className="material-symbols-outlined mb-2 text-3xl text-ndmu-green-700">upload_file</span>
                  <span className="text-xs font-bold text-slate-700">Choose screenshots or supporting files</span>
                  <span className="mt-1 text-[11px] text-slate-400">You can select multiple files</span>
                  <input id="ticket-attachments" type="file" multiple onChange={handleFileChange} className="sr-only" />
                </label>
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-700"><span className="material-symbols-outlined text-base text-ndmu-green-700">description</span><span className="truncate">{file.name}</span></span>
                        <button type="button" onClick={() => setAttachments((files) => files.filter((_, fileIndex) => fileIndex !== index))} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${file.name}`}><span className="material-symbols-outlined text-base">close</span></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ndmu-green-700">Request summary</p>
              <h2 className="mt-0.5 text-base font-extrabold text-slate-900">Ready to submit?</h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${selectedCategoryId ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{selectedCategoryId ? '✓' : '1'}</span>
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Category</p><p className="truncate text-xs font-semibold text-slate-700">{currentCategory?.name || 'Not selected'}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${currentSubcategory ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{currentSubcategory ? '✓' : '2'}</span>
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Service item</p><p className="text-xs font-semibold leading-5 text-slate-700">{currentSubcategory?.name || 'Not selected'}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${title.trim() && description.trim() ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{title.trim() && description.trim() ? '✓' : '3'}</span>
                  <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Details</p><p className="text-xs font-semibold text-slate-700">{title.trim() && description.trim() ? 'Required details added' : 'Title and description required'}</p></div>
                </div>
              </div>

              {currentSubcategory && <div className={`rounded-lg px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide ${ticketType === 'incident' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{ticketType === 'incident' ? 'Incident report' : 'Service request'}</div>}

              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-ndmu-green-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60">
                <span className={`material-symbols-outlined text-lg ${submitting ? 'animate-spin' : ''}`}>{submitting ? 'progress_activity' : 'send'}</span>
                {submitting ? 'Submitting...' : 'Submit request'}
              </button>
              <Link to="/" className="block text-center text-xs font-semibold text-slate-500 transition hover:text-slate-800">Cancel request</Link>
            </div>
          </div>

          <div className="rounded-2xl border border-ndmu-green-200 bg-ndmu-green-50 p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-xl text-ndmu-green-700">tips_and_updates</span>
              <div><p className="text-xs font-bold text-ndmu-green-900">Help us resolve it faster</p><p className="mt-1 text-[11px] leading-5 text-ndmu-green-800/75">Include the exact location, device used, error message, and when the issue started.</p></div>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
