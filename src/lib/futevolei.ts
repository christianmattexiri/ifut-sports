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

export async function joinByInviteCode(code: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");

  const trimmed = code.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(trimmed)) throw new Error("Código inválido (6 caracteres)");

  const { data: instructorId, error: lookupErr } = await supabase.rpc(
    "lookup_futevolei_instructor_by_code",
    { _code: trimmed },
  );
  if (lookupErr) throw lookupErr;
  if (!instructorId) throw new Error("Código não encontrado");

  const { data, error } = await supabase
    .from("futevolei_members")
    .insert({
      instructor_id: instructorId as string,
      student_id: auth.user.id,
      status: "pending",
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Você já solicitou vínculo com este instrutor");
    throw error;
  }
  return data as Membership;
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
  const { data } = await supabase
    .from("futevolei_members")
    .select("*")
    .eq("student_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Membership | null;
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

export async function getInstructorById(id: string) {
  const { data } = await supabase
    .from("futevolei_instructors")
    .select("user_id,nome,apelido,local_aula")
    .eq("user_id", id)
    .maybeSingle();
  return data;
}