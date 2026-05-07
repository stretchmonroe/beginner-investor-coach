import { supabase } from "./supabase";

export interface CoachConversation {
  id: string;
  question: string;
  answer: string;
  investor_profile: string | null;
  created_at: string;
}

export async function saveCoachConversation(
  sessionId: string,
  question: string,
  answer: string,
  profile: string | null
): Promise<void> {
  const { error } = await supabase.from("anonymous_coach_conversations").insert({
    anonymous_session_id: sessionId,
    question,
    answer,
    investor_profile: profile,
  });
  if (error) console.error("Failed to save coach conversation:", error.message);
}

export async function getCoachConversations(
  sessionId: string
): Promise<CoachConversation[]> {
  const { data, error } = await supabase
    .from("anonymous_coach_conversations")
    .select("id, question, answer, investor_profile, created_at")
    .eq("anonymous_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("Failed to fetch coach conversations:", error.message);
    return [];
  }
  return data as CoachConversation[];
}

export async function deleteCoachConversation(id: string): Promise<void> {
  const { error } = await supabase
    .from("anonymous_coach_conversations")
    .delete()
    .eq("id", id);
  if (error) console.error("Failed to delete coach conversation:", error.message);
}

export async function deleteAllCoachConversations(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("anonymous_coach_conversations")
    .delete()
    .eq("anonymous_session_id", sessionId);
  if (error) throw new Error(error.message);
}
