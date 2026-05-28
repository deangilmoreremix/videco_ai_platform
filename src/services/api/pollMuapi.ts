export async function pollMuapiJob(jobId: string): Promise<{
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output_url?: string;
  error?: string;
}> {
  const response = await fetch(`/api/v1/videos/poll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job_id: jobId }),
  });

  if (!response.ok) {
    throw new Error('Failed to poll Muapi job');
  }

  return response.json();
}

export async function pollUntilComplete(
  jobId: string,
  onProgress?: (status: string) => void,
  intervalMs: number = 2000,
  maxAttempts: number = 150
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await pollMuapiJob(jobId);

    onProgress?.(status.status);

    if (status.status === 'completed' && status.output_url) {
      return status.output_url;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Job failed');
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Job timed out');
}