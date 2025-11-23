import client from "../../auth/api-client/api_client";
import { GetTodayHabitsResponse } from "../dashboard/models/HabitResponse";

// adjust these paths/types to your actual structure

// GET /api/habits – predefined habits for selection/search
const GetHabits = (search?: string) =>
  client.get<GetTodayHabitsResponse>("/habit", {
    params: search ? { search } : undefined,
  });

// POST /api/proofs – upload proof for a habit
// formData: FormData with fields { proof, habitId }
const SubmitProof = (formData: FormData) =>
  client.post("/proofs", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export default {
  GetHabits,
  SubmitProof,
};