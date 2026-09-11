import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function KbArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [helpfulGiven, setHelpfulGiven] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await api.get(`/kb/${slug}`);
        if (res.data.success) {
          setArticle(res.data.article);
        }
      } catch (err) {
        console.error("Failed to load article:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [slug]);

  const handleHelpful = async () => {
    if (helpfulGiven || !article) return;
    try {
      await api.post(`/kb/${article.id}/helpful`);
      setHelpfulGiven(true);
    } catch (err) {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ndmu-green-700"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Article Not Found</h2>
        <Link
          to="/kb"
          className="text-xs font-bold text-ndmu-green-700 hover:underline mt-2 inline-block"
        >
          Return to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        to="/kb"
        className="inline-flex items-center gap-1 text-xs font-semibold text-ndmu-green-700 hover:underline mb-4"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>{" "}
        Back to Knowledge Base
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
        <div className="pb-6 border-b border-slate-100">
          <span className="text-[10px] font-extrabold text-ndmu-green-700 bg-ndmu-green-50 px-3 py-1 rounded-full uppercase">
            {article.category}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 mb-2">
            {article.title}
          </h1>
          <p className="text-xs text-slate-400">
            Updated on{" "}
            {new Date(
              article.updated_at || article.created_at,
            ).toLocaleDateString()}{" "}
            &bull; {article.views} views
          </p>
        </div>

        {/* Article Body */}
        <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap space-y-4">
          {article.content}
        </div>

        {/* Helpful Feedback Box */}
        <div className="pt-6 border-t border-slate-100 bg-slate-50 -mx-6 sm:-mx-10 -mb-6 sm:-mb-10 p-6 sm:p-8 rounded-b-3xl text-center">
          <p className="text-xs font-bold text-slate-700 mb-3">
            Was this article helpful?
          </p>
          {helpfulGiven ? (
            <span className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">
                check_circle
              </span>
              Thank you for your feedback!
            </span>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleHelpful}
                className="px-4 py-1.5 bg-white border border-slate-200 hover:border-ndmu-green-500 hover:text-ndmu-green-700 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">
                  thumb_up
                </span>{" "}
                Yes
              </button>
              <Link
                to="/submit"
                className="px-4 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">
                  support_agent
                </span>{" "}
                Need more help? Submit Ticket
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
