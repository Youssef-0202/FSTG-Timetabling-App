import { mockCandidates, Candidate } from "./candidates";
import { addToQueue, QueueStatus } from "../candidateQueue";

/**
 * Seed data: Maps candidates to jobs with specific statuses
 * This simulates candidates already in the review queue
 */
interface SeedEntry {
    candidateId: string;
    jobId: string;
    jobTitle: string;
    status: QueueStatus;
}

const queueSeedData: SeedEntry[] = [
    // Senior Full Stack Developer (job-1) - 6 candidates
    {
        candidateId: "1", // Sarah Johnson - 95% match
        jobId: "job-1",
        jobTitle: "Senior Full Stack Developer",
        status: "shortlisted",
    },
    {
        candidateId: "2", // Alexandre Martin - 92% match
        jobId: "job-1",
        jobTitle: "Senior Full Stack Developer",
        status: "to_review",
    },
    {
        candidateId: "3", // Marie Dubois - 88% match
        jobId: "job-1",
        jobTitle: "Senior Full Stack Developer",
        status: "accepted",
    },
    {
        candidateId: "4", // Thomas Bernard - 85% match
        jobId: "job-1",
        jobTitle: "Senior Full Stack Developer",
        status: "shortlisted",
    },
    {
        candidateId: "5", // Sophie Laurent - 82% match
        jobId: "job-1",
        jobTitle: "Senior Full Stack Developer",
        status: "to_review",
    },
    {
        candidateId: "6", // Lucas Petit - 78% match
        jobId: "job-1",
        jobTitle: "Senior Full Stack Developer",
        status: "rejected",
    },

    // UI/UX Designer (job-2) - 4 candidates
    {
        candidateId: "7", // Emma Moreau - 90% match
        jobId: "job-2",
        jobTitle: "UI/UX Designer",
        status: "shortlisted",
    },
    {
        candidateId: "8", // Hugo Simon - 87% match
        jobId: "job-2",
        jobTitle: "UI/UX Designer",
        status: "to_review",
    },
    {
        candidateId: "9", // Camille Rousseau - 84% match
        jobId: "job-2",
        jobTitle: "UI/UX Designer",
        status: "accepted",
    },
    {
        candidateId: "10", // Antoine Lefevre - 75% match
        jobId: "job-2",
        jobTitle: "UI/UX Designer",
        status: "rejected",
    },

    // DevOps Engineer (job-3) - 3 candidates
    {
        candidateId: "11", // Léa Garnier - 93% match
        jobId: "job-3",
        jobTitle: "DevOps Engineer",
        status: "accepted",
    },
    {
        candidateId: "12", // Paul Chevalier - 89% match
        jobId: "job-3",
        jobTitle: "DevOps Engineer",
        status: "shortlisted",
    },
    {
        candidateId: "13", // Juliette Fontaine - 80% match
        jobId: "job-3",
        jobTitle: "DevOps Engineer",
        status: "to_review",
    },

    // Mobile App Developer (job-4) - 2 candidates
    {
        candidateId: "14", // Maxime Girard - 91% match
        jobId: "job-4",
        jobTitle: "Mobile App Developer",
        status: "shortlisted",
    },
    {
        candidateId: "15", // Charlotte Bonnet - 86% match
        jobId: "job-4",
        jobTitle: "Mobile App Developer",
        status: "to_review",
    },
];

/**
 * Seed the candidate review queue with mock data
 * This will populate the queue with candidates across different jobs and statuses
 * 
 * @param force - If true, will clear existing queue and reseed. If false, only seed if queue is empty
 */
export function seedCandidateQueue(force: boolean = false): void {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
        console.warn("Cannot seed queue in server environment");
        return;
    }

    // Check if queue already has data
    const existingQueue = localStorage.getItem("candidateQueue");
    if (existingQueue && existingQueue !== "[]" && !force) {
        console.log("Queue already has data. Use seedCandidateQueue(true) to force reseed.");
        return;
    }

    // Clear existing queue if force is true
    if (force) {
        localStorage.setItem("candidateQueue", "[]");
        console.log("Cleared existing queue data");
    }

    // Seed the queue
    let seededCount = 0;
    queueSeedData.forEach((entry) => {
        const candidate = mockCandidates.find((c) => c.id === entry.candidateId);

        if (candidate) {
            try {
                addToQueue(candidate, entry.jobId, entry.jobTitle, entry.status);
                seededCount++;
            } catch (error) {
                console.error(
                    `Failed to add candidate ${entry.candidateId} to queue:`,
                    error
                );
            }
        } else {
            console.warn(`Candidate with ID ${entry.candidateId} not found in mock data`);
        }
    });

    console.log(`✅ Successfully seeded ${seededCount} candidates to the review queue`);
    console.log(`Distribution:`);
    
    // Count by status
    const statusCounts = queueSeedData.reduce((acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
    }, {} as Record<QueueStatus, number>);

    console.log(`  📘 To Review: ${statusCounts.to_review || 0}`);
    console.log(`  ⭐ Shortlisted: ${statusCounts.shortlisted || 0}`);
    console.log(`  ✅ Accepted: ${statusCounts.accepted || 0}`);
    console.log(`  ❌ Rejected: ${statusCounts.rejected || 0}`);
}

/**
 * Clear all candidates from the review queue
 */
export function clearCandidateQueue(): void {
    if (typeof window === "undefined") {
        console.warn("Cannot clear queue in server environment");
        return;
    }

    localStorage.setItem("candidateQueue", "[]");
    console.log("✅ Candidate queue cleared");
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
    if (typeof window === "undefined") {
        return null;
    }

    const queueData = localStorage.getItem("candidateQueue");
    if (!queueData || queueData === "[]") {
        return {
            total: 0,
            to_review: 0,
            shortlisted: 0,
            accepted: 0,
            rejected: 0,
        };
    }

    try {
        const queue = JSON.parse(queueData);
        const stats = {
            total: queue.length,
            to_review: queue.filter((e: any) => e.status === "to_review").length,
            shortlisted: queue.filter((e: any) => e.status === "shortlisted").length,
            accepted: queue.filter((e: any) => e.status === "accepted").length,
            rejected: queue.filter((e: any) => e.status === "rejected").length,
        };

        return stats;
    } catch (error) {
        console.error("Error getting queue stats:", error);
        return null;
    }
}
