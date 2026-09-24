import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmForm from "../components/ConfirmForm";

const blankTeam = { name: "", description: "", is_active: true };
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100";

export default function AdminTeams() {
  const { user, isAdmin, isTeamLeader, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [teamModal, setTeamModal] = useState(null);
  const [memberTeam, setMemberTeam] = useState(null);
  const [memberIds, setMemberIds] = useState([]);
  const [membershipRole, setMembershipRole] = useState("member");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const requests = [api.get("/teams")];
      if (isAdmin) requests.push(api.get("/users"));
      const [teamsResponse, usersResponse] = await Promise.all(requests);
      setTeams(teamsResponse.data.teams || []);
      if (usersResponse?.data.success) {
        setStaff(
          (usersResponse.data.users || []).filter(
            (account) =>
              account.is_active &&
              ["admin", "team_leader", "technician"].includes(account.role),
          ),
        );
      }
    } catch {
      setError("Teams could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isTeamLeader))) {
      navigate("/login");
      return;
    }
    if (user && (isAdmin || isTeamLeader)) loadData();
  }, [user, isAdmin, isTeamLeader, authLoading, navigate]);

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return teams;
    return teams.filter((team) =>
      [
        team.name,
        team.description,
        ...(team.members || []).map((member) => member.full_name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [teams, search]);
  const totals = useMemo(
    () => ({
      teams: teams.length,
      active: teams.filter((team) => team.is_active).length,
      members: new Set(
        teams.flatMap((team) =>
          (team.members || []).map((member) => member.id),
        ),
      ).size,
    }),
    [teams],
  );
  const candidates = (
    memberTeam
      ? staff.filter(
          (account) =>
            !memberTeam.members?.some((member) => member.id === account.id),
        )
      : []
  ).map((account) => ({
    value: String(account.id),
    label: `${account.full_name} — ${account.role.replace("_", " ")}`,
    detail: account.location_name || "NDMU Community",
  }));

  const saveTeam = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (teamModal.id) await api.patch(`/teams/${teamModal.id}`, teamModal);
      else await api.post("/teams", teamModal);
      setTeamModal(null);
      await loadData();
    } catch (requestError) {
      alert(requestError.response?.data?.message || "Unable to save the team.");
    } finally {
      setSaving(false);
    }
  };
  const addMember = async (event) => {
    event.preventDefault();
    if (!memberIds.length) return;
    setSaving(true);
    try {
      await api.post(`/teams/${memberTeam.id}/members`, {
        user_ids: memberIds.map(Number),
        membership_role: membershipRole,
      });
      setMemberTeam(null);
      setMemberIds([]);
      setMembershipRole("member");
      await loadData();
    } catch (requestError) {
      alert(
        requestError.response?.data?.message ||
          "Unable to add the team member.",
      );
    } finally {
      setSaving(false);
    }
  };
  const removeMember = async (team, member) => {
    if (!window.confirm(`Remove ${member.full_name} from ${team.name}?`))
      return;
    try {
      await api.delete(`/teams/${team.id}/members/${member.id}`);
      await loadData();
    } catch (requestError) {
      alert(
        requestError.response?.data?.message ||
          "Unable to remove the team member.",
      );
    }
  };

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">
              Teams & coverage
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              ICT-MIS teams
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Organize technical staff, team leads, and ticket-routing
              ownership.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setTeamModal({ ...blankTeam })}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-ndmu-green-600 hover:shadow-md"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Create team
            </button>
          )}
        </div>
      </header>
      <div className="space-y-5 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric
            icon="group"
            label="Teams"
            value={totals.teams}
            tone="slate"
          />
          <Metric
            icon="verified_user"
            label="Active teams"
            value={totals.active}
            tone="blue"
          />
          <Metric
            icon="engineering"
            label="Assigned staff"
            value={totals.members}
            tone="violet"
          />
        </section>
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
              search
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search teams or members"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-ndmu-green-500 focus:bg-white focus:ring-2 focus:ring-ndmu-green-100"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {filteredTeams.length} team{filteredTeams.length === 1 ? "" : "s"}{" "}
            shown
          </span>
        </section>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}
        {loading ? (
          <Loading />
        ) : filteredTeams.length ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Team directory
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {filteredTeams.length} matching team
                  {filteredTeams.length === 1 ? "" : "s"}
                </p>
              </div>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[11px] font-bold text-ndmu-green-700 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
              {filteredTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  isAdmin={isAdmin}
                  onEdit={() => setTeamModal({ ...team })}
                  onAddMember={() => {
                    setMemberIds([]);
                    setMemberTeam(team);
                  }}
                  onRemoveMember={removeMember}
                />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState />
        )}
      </div>
      <Modal
        isOpen={Boolean(teamModal)}
        onClose={() => !saving && setTeamModal(null)}
        title={teamModal?.id ? "Edit ICT-MIS team" : "Create ICT-MIS team"}
        maxWidth="max-w-xl"
      >
        {teamModal && (
          <ConfirmForm
            onConfirm={saveTeam}
            title={teamModal.id ? "Save team changes?" : "Create team?"}
            description={
              teamModal.id
                ? "Apply changes to this operational team."
                : "Create this operational team."
            }
            confirmLabel={teamModal.id ? "Save changes" : "Create team"}
            className="space-y-4 text-xs"
          >
            <Label label="Team name" required>
              <input
                required
                value={teamModal.name}
                onChange={(event) =>
                  setTeamModal({ ...teamModal, name: event.target.value })
                }
                placeholder="e.g. Network Operations"
                className={inputClass}
              />
            </Label>
            <Label label="Responsibilities / description">
              <textarea
                rows="4"
                value={teamModal.description || ""}
                onChange={(event) =>
                  setTeamModal({
                    ...teamModal,
                    description: event.target.value,
                  })
                }
                placeholder="Describe this team's service ownership and scope."
                className={inputClass}
              />
            </Label>
            <Toggle
              active={Boolean(teamModal.is_active)}
              onChange={(is_active) =>
                setTeamModal({ ...teamModal, is_active })
              }
            />
            <Actions
              saving={saving}
              onCancel={() => setTeamModal(null)}
              submit={teamModal.id ? "Save changes" : "Create team"}
            />
          </ConfirmForm>
        )}
      </Modal>
      <Modal
        isOpen={Boolean(memberTeam)}
        onClose={() => {
          if (!saving) {
            setMemberTeam(null);
            setMemberIds([]);
          }
        }}
        title={`Add member to ${memberTeam?.name || "team"}`}
        maxWidth="max-w-2xl"
        allowOverflow
      >
        <ConfirmForm
          onConfirm={addMember}
          title="Add team members?"
          description="Add the selected staff members to this team."
          confirmLabel="Add members"
          className="space-y-4 text-xs"
        >
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 leading-5 text-emerald-900">
            Choose an active administrator, team leader, or technician. A staff
            member may belong to more than one operational team.
          </p>
          <Label label="Staff member" required>
            <SearchSelect
              values={memberIds}
              onChange={setMemberIds}
              options={candidates}
              placeholder="Search and select a staff member"
              required
            />
          </Label>
          <Label label="Team membership">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "member", label: "Member", icon: "engineering" },
                {
                  value: "leader",
                  label: "Team lead",
                  icon: "workspace_premium",
                },
              ].map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setMembershipRole(option.value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left font-bold transition ${membershipRole === option.value ? "border-ndmu-green-700 bg-ndmu-green-50 text-ndmu-green-800 ring-2 ring-ndmu-green-100" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <span className="material-symbols-outlined text-base">
                    {option.icon}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </Label>
          {!candidates.length && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
              All available staff are already members of this team.
            </p>
          )}
          <Actions
            saving={saving}
            disabled={!memberIds.length}
            onCancel={() => {
              setMemberTeam(null);
              setMemberIds([]);
            }}
            submit={`Add ${memberIds.length || ""} user${memberIds.length === 1 ? "" : "s"} to team`}
          />
        </ConfirmForm>
      </Modal>
    </main>
  );
}

function TeamCard({ team, isAdmin, onEdit, onAddMember, onRemoveMember }) {
  const members = team.members || [];
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${team.is_active ? "border-slate-200" : "border-slate-200 opacity-80"}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex min-w-0 gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ndmu-green-700 text-white">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-black text-slate-900">
                {team.name}
              </h2>
              <Status active={team.is_active} />
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {team.description ||
                "No responsibilities have been documented yet."}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={onEdit}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
            title="Edit team"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
        )}
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
            Team members · {members.length}
          </p>
          {isAdmin && (
            <button
              onClick={onAddMember}
              disabled={!team.is_active}
              className="inline-flex items-center gap-1 rounded-lg bg-ndmu-green-700 px-2.5 py-1.5 text-[10px] font-extrabold text-white hover:bg-ndmu-green-600 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">
                person_add
              </span>
              Add user
            </button>
          )}
        </div>
        <div className="space-y-2">
          {members.length ? (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-ndmu-green-800">
                  {member.full_name
                    ?.split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800">
                    {member.full_name}
                  </p>
                  <p className="truncate text-[10px] text-slate-500">
                    {member.location_name || "NDMU Community"}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-[9px] font-extrabold uppercase ${member.membership_role === "leader" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700"}`}
                >
                  {member.membership_role === "leader" ? "Team lead" : "Member"}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => onRemoveMember(team, member)}
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title={`Remove ${member.full_name}`}
                  >
                    <span className="material-symbols-outlined text-base">
                      person_remove
                    </span>
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
              No staff members have been assigned.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
function SearchSelect({ values, onChange, options, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.filter((option) => values.includes(option.value));
  const filtered = options.filter((option) =>
    `${option.label} ${option.detail || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputClass} flex items-center justify-between text-left ${open ? "border-ndmu-green-600 ring-4 ring-ndmu-green-100" : ""}`}
      >
        <span className={selected.length ? "text-slate-800" : "text-slate-400"}>
          {selected.length
            ? `${selected.length} staff member${selected.length === 1 ? "" : "s"} selected`
            : placeholder}
        </span>
        <span className="material-symbols-outlined text-lg text-slate-500">
          expand_more
        </span>
      </button>
      {required && (
        <input
          tabIndex="-1"
          required
          value={values.join(",")}
          onChange={() => {}}
          className="sr-only"
        />
      )}
      {open && (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-ndmu-green-600"
          />
          <div className="mt-1 max-h-48 overflow-y-auto">
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onChange(
                    values.includes(option.value)
                      ? values.filter((value) => value !== option.value)
                      : [...values, option.value],
                  )
                }
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-ndmu-green-50 ${values.includes(option.value) ? "bg-ndmu-green-50" : ""}`}
              >
                <span
                  className={`material-symbols-outlined text-base ${values.includes(option.value) ? "text-ndmu-green-700" : "text-slate-300"}`}
                >
                  {values.includes(option.value)
                    ? "check_box"
                    : "check_box_outline_blank"}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800">
                    {option.label}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {option.detail}
                  </span>
                </span>
              </button>
            ))}
            {!filtered.length && (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                No matching staff found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Metric({ icon, label, value, tone = "slate" }) {
  const colors = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    slate: "border-slate-200 bg-slate-100 text-slate-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${colors[tone]}`}
        >
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
      </div>
    </div>
  );
}
function Status({ active }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
function Label({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-bold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
function Toggle({ active, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="font-bold text-slate-800">Active status</p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Inactive teams remain in history but cannot receive new work.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={() => onChange(!active)}
        className={`relative h-7 w-12 rounded-full transition ${active ? "bg-ndmu-green-700" : "bg-slate-300"}`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${active ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}
function Actions({ saving, disabled, onCancel, submit }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving || disabled}
        className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 font-extrabold text-white hover:bg-ndmu-green-600 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">group_add</span>
        {saving ? "Saving..." : submit}
      </button>
    </div>
  );
}
function Loading() {
  return (
    <div className="flex justify-center py-24">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-ndmu-green-700 border-t-transparent" />
    </div>
  );
}
function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
      <span className="material-symbols-outlined text-4xl text-slate-300">
        groups
      </span>
      <p className="mt-3 font-bold text-slate-700">
        No teams match this search.
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Try another team or member name.
      </p>
    </div>
  );
}
