// Candidate Queue Management (LocalStorage-based for now)

import { Candidate, mockCandidates } from "./mockData/candidates";

export type QueueStatus = "to_review" | "shortlisted" | "accepted" | "rejected";

export interface QueuedCandidate {
  candidateId: string;
  jobId: string;
  jobTitle: string;
  status: QueueStatus;
  addedAt: string;
  updatedAt: string;
}

export interface EnrichedQueuedCandidate {
  candidate: Candidate;
  jobId: string;
  jobTitle: string;
  addedAt: Date;
  status: QueueStatus;
}

const QUEUE_KEY = "candidateQueue";

// Get all queued candidates (raw data)
function getRawQueue(): QueuedCandidate[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

// Get all queued candidates with full candidate data
export function getQueuedCandidates(status?: QueueStatus): EnrichedQueuedCandidate[] {
  const queue = getRawQueue();
  const filtered = status ? queue.filter(q => q.status === status) : queue;
  
  return filtered
    .map(queueEntry => {
      const candidate = mockCandidates.find(c => c.id === queueEntry.candidateId);
      
      if (!candidate) {
        console.warn(`Candidate ${queueEntry.candidateId} not found in mock data`);
        return null;
      }
      
      return {
        candidate,
        jobId: queueEntry.jobId,
        jobTitle: queueEntry.jobTitle,
        addedAt: new Date(queueEntry.addedAt),
        status: queueEntry.status,
      };
    })
    .filter((item): item is EnrichedQueuedCandidate => item !== null);
}

// Add candidate to queue
export function addToQueue(
  candidate: Candidate,
  jobId: string,
  jobTitle: string,
  status: QueueStatus = "to_review"
): void {
  const queue = getRawQueue();
  const existing = queue.find(
    (q) => q.candidateId === candidate.id && q.jobId === jobId
  );

  if (existing) {
    // Update existing
    existing.status = status;
    existing.updatedAt = new Date().toISOString();
  } else {
    // Add new
    queue.push({
      candidateId: candidate.id,
      jobId,
      jobTitle,
      status,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Update candidate status in queue
export function updateQueueStatus(
  candidateId: string,
  jobId: string,
  newStatus: QueueStatus
): void {
  const queue = getRawQueue();
  const candidate = queue.find(
    (q) => q.candidateId === candidateId && q.jobId === jobId
  );

  if (candidate) {
    candidate.status = newStatus;
    candidate.updatedAt = new Date().toISOString();
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

// Remove candidate from queue
export function removeFromQueue(candidateId: string, jobId: string): void {
  const queue = getRawQueue();
  const filtered = queue.filter(
    (q) => !(q.candidateId === candidateId && q.jobId === jobId)
  );
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

// Check if candidate is in queue
export function isInQueue(candidateId: string, jobId: string): boolean {
  const queue = getRawQueue();
  return queue.some(
    (q) => q.candidateId === candidateId && q.jobId === jobId
  );
}

// Get candidate queue status
export function getQueueStatus(
  candidateId: string,
  jobId: string
): QueueStatus | null {
  const queue = getRawQueue();
  const candidate = queue.find(
    (q) => q.candidateId === candidateId && q.jobId === jobId
  );
  return candidate?.status || null;
}
