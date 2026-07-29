import { db, enqueueOutbox, type MilestoneProgress } from "./index";
import { MILESTONES } from "../data/milestones";

function nowIso(): string {
  return new Date().toISOString();
}

export async function listMilestoneProgress(
  programPhase: 1 | 2 | 3,
): Promise<(MilestoneProgress & { title: string; detail: string; phase: 1 | 2 | 3 })[]> {
  const rows = await db.milestones.toArray();
  const byId = new Map(rows.map((r) => [r.milestoneId, r]));

  return MILESTONES.map((m) => {
    const existing = byId.get(m.id);
    const status =
      existing?.status ??
      (m.phase > programPhase ? "locked" : "active");
    return {
      milestoneId: m.id,
      title: m.title,
      detail: m.detail,
      phase: m.phase,
      status: status as MilestoneProgress["status"],
      note: existing?.note,
      doneAt: existing?.doneAt ?? null,
      updatedAt: existing?.updatedAt,
    };
  });
}

export async function setMilestoneStatus(
  milestoneId: string,
  status: MilestoneProgress["status"],
  note?: string,
): Promise<void> {
  const updatedAt = nowIso();
  const row: MilestoneProgress = {
    milestoneId,
    status,
    note,
    doneAt: status === "done" ? Date.now() : null,
    updatedAt,
  };
  await db.milestones.put(row);
  await enqueueOutbox(
    "milestones",
    milestoneId,
    {
      milestone_id: milestoneId,
      status,
      note: note ?? null,
      done_at: row.doneAt ? new Date(row.doneAt).toISOString() : null,
      updated_at: updatedAt,
    },
    updatedAt,
  );
}
