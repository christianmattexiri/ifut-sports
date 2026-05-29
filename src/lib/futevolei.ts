import { supabase } from "@/integrations/supabase/client";

export type InstructorProfile = {
  user_id: string;
  nome: string;
  apelido: string | null;
  idade: number | null;
  local_aula: string | null;
  invite_code: string;
};

export type StudentProfile = {
  user_id: string;
  nome: string;
  apelido: string | null;
  idade: number | null;
  perna_dominante: string | null;
  nivel_atual: string;
};

export type Membership = {
  id: string;
  instructor_id: string;
  student_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export async function createInstructor(input: {
  nome: string;
  apelido?: string;
  idade?: number;
  local_aula?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");

  const { data: codeData, error: codeErr } = await supabase.rpc("gen_futevolei_invite_code");
  if (codeErr) throw codeErr;

  const { data, error } = await supabase
    .from("futevolei_instructors")
    .insert({
      user_id: auth.user.id,
      nome: input.nome,
      apelido: input.apelido ?? null,
      idade: input.idade ?? null,
      local_aula: input.local_aula ?? null,
      invite_code: codeData as string,
    })
    .select()
    .single();
  if (error) throw error;
  return data as InstructorProfile;
}

export async function createStudent(input: {
  nome: string;
  apelido?: string;
  idade?: number;
  perna_dominante?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("futevolei_students")
    .insert({
      user_id: auth.user.id,
      nome: input.nome,
      apelido: input.apelido ?? null,
      idade: input.idade ?? null,
      perna_dominante: input.perna_dominante ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as StudentProfile;
}

export async function getMyApprovedMembership() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("futevolei_members")
    .select("*")
    .eq("student_id", auth.user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Membership | null;
}

type PostgrestErrorLike = { code?: string; message?: string };

/** Mensagem amigável para toasts do fluxo de vínculo/cadastro. */
export function formatFutevoleiError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = String((err as PostgrestErrorLike).message);
    if (msg) return msg;
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

function mapJoinError(err: PostgrestErrorLike): Error {
  if (err.code === "23505") {
    return new Error("Você já possui uma solicitação com este instrutor.");
  }
  if (err.code === "42501") {
    return new Error("Sem permissão para atualizar o vínculo. Verifique se as migrations do Futevôlei foram aplicadas.");
  }
  if (err.message?.includes("permission") || err.message?.includes("policy")) {
    return new Error("Operação não permitida. Tente novamente ou contate o suporte.");
  }
  return new Error(formatFutevoleiError(err));
}

async function findMembership(studentId: string, instructorId: string) {
  const { data, error } = await supabase
    .from("futevolei_members")
    .select("id, status, instructor_id, student_id")
    .eq("student_id", studentId)
    .eq("instructor_id", instructorId)
    .maybeSingle();
  if (error) throw mapJoinError(error);
  return data as Membership | null;
}

async function insertPendingMembership(studentId: string, instructorId: string) {
  const { data, error } = await supabase
    .from("futevolei_members")
    .insert({
      instructor_id: instructorId,
      student_id: studentId,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw mapJoinError(error);
  return data as Membership;
}

/** Reativa vínculo recusado: UPDATE → pending; se falhar (RLS), DELETE + INSERT. */
async function reactivateRejectedMembership(
  memberId: string,
  studentId: string,
  instructorId: string,
): Promise<Membership> {
  const { data: updated, error: updateErr } = await supabase
    .from("futevolei_members")
    .update({ status: "pending" })
    .eq("id", memberId)
    .select()
    .single();

  if (!updateErr && updated) return updated as Membership;

  const { error: deleteErr } = await supabase
    .from("futevolei_members")
    .delete()
    .eq("id", memberId)
    .eq("student_id", studentId);

  if (deleteErr) throw mapJoinError(updateErr ?? deleteErr);

  return insertPendingMembership(studentId, instructorId);
}

export async function joinByInviteCode(code: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");

  const trimmed = code.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(trimmed)) {
    throw new Error("Código inválido. Use exatamente 6 caracteres (letras e números).");
  }

  const { data: instructorId, error: lookupErr } = await supabase.rpc(
    "lookup_futevolei_instructor_by_code",
    { _code: trimmed },
  );
  if (lookupErr) throw mapJoinError(lookupErr);
  if (!instructorId) throw new Error("Código não encontrado. Confira com seu instrutor.");

  const instructorUuid = instructorId as string;
  const studentId = auth.user.id;

  const existing = await findMembership(studentId, instructorUuid);

  if (existing) {
    switch (existing.status) {
      case "approved":
        throw new Error("Você já está vinculado a este instrutor.");
      case "pending":
        throw new Error("Solicitação já enviada. Aguarde a aprovação do instrutor.");
      case "rejected":
        return reactivateRejectedMembership(existing.id, studentId, instructorUuid);
      default:
        break;
    }
  }

  try {
    return await insertPendingMembership(studentId, instructorUuid);
  } catch (err) {
    if (err instanceof Error && err.message.includes("já possui")) {
      const again = await findMembership(studentId, instructorUuid);
      if (again?.status === "rejected") {
        return reactivateRejectedMembership(again.id, studentId, instructorUuid);
      }
      if (again?.status === "pending") {
        throw new Error("Solicitação já enviada. Aguarde a aprovação do instrutor.");
      }
    }
    throw err;
  }
}

export async function getFutevoleiOnboardingState() {
  const [instructor, student] = await Promise.all([getMyInstructor(), getMyStudent()]);
  return {
    hasInstructor: !!instructor,
    hasStudent: !!student,
    instructor,
    student,
  };
}

export async function getMyInstructor() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("futevolei_instructors")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return data as InstructorProfile | null;
}

export async function getMyStudent() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("futevolei_students")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return data as StudentProfile | null;
}

export async function getMyMembership() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: rows, error } = await supabase
    .from("futevolei_members")
    .select("*")
    .eq("student_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = (rows ?? []) as Membership[];
  const active = list.find((m) => m.status === "pending" || m.status === "approved");
  if (active) return active;
  return list[0] ?? null;
}

export async function listInstructorMembers(instructorId: string) {
  const { data: members, error } = await supabase
    .from("futevolei_members")
    .select("*")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (members ?? []) as Membership[];
  const studentIds = rows.map((m) => m.student_id);
  if (studentIds.length === 0) return [] as Array<Membership & { student?: StudentProfile }>;
  const { data: students } = await supabase
    .from("futevolei_students")
    .select("*")
    .in("user_id", studentIds);
  const byId = new Map<string, StudentProfile>(
    ((students ?? []) as StudentProfile[]).map((s) => [s.user_id, s]),
  );
  return rows.map((m) => ({ ...m, student: byId.get(m.student_id) }));
}

export async function respondMembership(memberId: string, action: "approved" | "rejected") {
  const { error } = await supabase
    .from("futevolei_members")
    .update({ status: action })
    .eq("id", memberId);
  if (error) throw error;
}

/** Remove vínculo instrutor ↔ aluno (apenas o instrutor dono do vínculo). */
export async function removeStudentMembership(instructorId: string, studentId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  if (auth.user.id !== instructorId) throw new Error("Sem permissão para remover este aluno");

  const { error } = await supabase
    .from("futevolei_members")
    .delete()
    .eq("instructor_id", instructorId)
    .eq("student_id", studentId);

  if (error) throw mapJoinError(error);
}

export async function getInstructorById(id: string) {
  const { data } = await supabase
    .from("futevolei_instructors")
    .select("user_id,nome,apelido,local_aula")
    .eq("user_id", id)
    .maybeSingle();
  return data;
}