import client from '../../../auth/api-client/api_client';

const logMood = async (mood: string) => {
  try {
    return await client.post<object>('/moods', {
      mood
    });
  } catch (error: any) {
    if (!error.response) {
      throw new Error('Server is offline, try again later.');
    }
    throw error;
  }
};

export default {
    logMood,
  };