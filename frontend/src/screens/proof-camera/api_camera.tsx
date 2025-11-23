import client from "../../auth/api-client/api_client";

type ListHabitsResponse = {
  success: boolean;
  habits: any[];
};

const GetHabits = (search?: string) => {
  console.log("GetHabits called with search:", search);

  return client
    .get<ListHabitsResponse>("/habit", {
      params: { search: search ?? "" }, // ALWAYS send search
    })
    .then((res) => {
      console.log("GetHabits axios config:", {
        url: res.config?.url,
        params: (res.config as any)?.params,
      });
      return res;
    });
};

const SubmitProof = (formData: FormData) =>
  client.post("/proofs", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export default {
  GetHabits,
  SubmitProof,
};