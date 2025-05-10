// lib/server/services/interview.service.ts

import prisma from "@/config/database/connection/sql.connection";
import { sanitizeContainerName, ensureUserContainer, uploadFile } from "@/lib/server/services/azure-blob.service";
import { ExperienceLevel, InterviewType, InterviewStage, InterviewMode, InterviewStatus } from "@prisma/client";
import { getUserContainer } from "@/lib/server/services/users.service";

/**
 * Get all job types from the database
 */
export const getJobTypes = async () => {
    return await prisma.jobType.findMany({
        orderBy: {
            label: 'asc'
        }
    });
};

/**
 * Get all programming languages from the database
 */
export const getProgrammingLanguages = async () => {
    return await prisma.programmingLanguage.findMany({
        orderBy: {
            label: 'asc'
        }
    });
};

/**
 * Get all countries from the database
 */
export const getCountries = async () => {
    return await prisma.country.findMany({
        orderBy: {
            label: 'asc'
        }
    });
};

/**
 * Get interview data by ID with all related information
 */
export const getInterviewById = async (id: string) => {
    return await prisma.interview.findUnique({
        where: {
            id
        },
        include: {
            jobType: true,
            country: true,
            programmingLanguages: {
                include: {
                    language: true
                }
            },
            questions: {
                orderBy: {
                    orderIndex: 'asc'
                },
                include: {
                    response: true
                }
            },
            feedback: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    container: true
                }
            }
        }
    });
};

/**
 * Get all interviews for a user
 */
export const getUserInterviews = async (userId: string) => {
    return await prisma.interview.findMany({
        where: {
            userId
        },
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            jobType: true,
            country: true,
            feedback: {
                select: {
                    overallScore: true
                }
            }
        }
    });
};

/**
 * Calculate remaining credits for a user
 */
export const getUserRemainingCredits = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true }
    });

    return user?.credits || 0;
};

/**
 * Create a new interview session
 */
export const createInterview = async (
    userId: string,
    data: {
        level: ExperienceLevel,
        jobTypeId: string,
        programmingLanguageIds: string[],
        interviewLanguage: string,
        countryId: string,
        interviewType: InterviewType,
        stage: InterviewStage,
        jobDescription: string,
        cvFile?: Buffer | null,
        cvFileName?: string | null,
        cvFileMimeType?: string | null,
        mode: InterviewMode
    }
) => {
    // Start a transaction to ensure all operations succeed or fail together
    return await prisma.$transaction(async (tx) => {
        // Verify user has enough credits
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { credits: true, clerkId: true, container: true }
        });

        if (!user) {
            throw new Error("User not found");
        }

        if (user.credits < 1) {
            throw new Error("Insufficient credits");
        }

        // Get container for CV upload if needed
        let cvUrl = null;
        if (data.cvFile && data.cvFileName && data.cvFileMimeType) {
            const containerName = user.container || await getUserContainer(parseInt(userId));

            if (!containerName) {
                throw new Error("User container not found");
            }

            // Ensure container exists
            await ensureUserContainer(containerName);

            // Upload CV file
            const cvPath = `interviews/cv/${Date.now()}-${data.cvFileName}`;
            await uploadFile(
                containerName,
                cvPath,
                data.cvFile,
                parseInt(userId),
                null, // folderId
                data.cvFileName,
                data.cvFileMimeType,
                user.clerkId
            );

            cvUrl = `${containerName}/${cvPath}`;
        }

        // Create the interview
        const interview = await tx.interview.create({
            data: {
                userId,
                level: data.level,
                jobTypeId: data.jobTypeId,
                interviewLanguage: data.interviewLanguage,
                countryId: data.countryId,
                interviewType: data.interviewType,
                stage: data.stage,
                jobDescription: data.jobDescription,
                cvUrl,
                mode: data.mode,
                status: InterviewStatus.SCHEDULED,
                programmingLanguages: {
                    create: data.programmingLanguageIds.map(languageId => ({
                        language: {
                            connect: {
                                id: languageId
                            }
                        }
                    }))
                }
            }
        });

        // Deduct one credit from user
        await tx.user.update({
            where: { id: userId },
            data: {
                credits: {
                    decrement: 1
                }
            }
        });

        return interview;
    });
};

/**
 * Generate questions for an interview
 */
export const generateInterviewQuestions = async (interviewId: string) => {
    const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
            jobType: true,
            programmingLanguages: {
                include: {
                    language: true
                }
            }
        }
    });

    if (!interview) {
        throw new Error("Interview not found");
    }

    // Mock questions for now - in a real scenario, these would be generated with AI
    const questions = [
        {
            content: `Tell me about your experience with ${interview.programmingLanguages[0]?.language.label || 'programming'}.`,
            type: 'BEHAVIORAL',
            orderIndex: 0
        },
        {
            content: `What's your approach to solving complex problems in ${interview.jobType.label}?`,
            type: 'BEHAVIORAL',
            orderIndex: 1
        },
        {
            content: `Can you explain how you would implement a feature for ${interview.jobDescription?.substring(0, 50) || 'a typical project'}...?`,
            type: 'TECHNICAL',
            orderIndex: 2,
            difficulty: 'MEDIUM'
        }
    ];

    // Save questions to database
    const savedQuestions = await Promise.all(
        questions.map((q, index) =>
            prisma.question.create({
                data: {
                    interviewId,
                    content: q.content,
                    type: q.type as any,
                    difficulty: q.type === 'TECHNICAL' ? (q.difficulty as any) : null,
                    orderIndex: index
                }
            })
        )
    );

    return savedQuestions;
};

/**
 * Update interview status
 */
export const updateInterviewStatus = async (
    interviewId: string,
    status: InterviewStatus,
    startedAt?: Date,
    endedAt?: Date
) => {
    return await prisma.interview.update({
        where: { id: interviewId },
        data: {
            status,
            ...(startedAt && { startedAt }),
            ...(endedAt && { endedAt })
        }
    });
};

/**
 * Save interview response
 */
export const saveResponse = async (
    questionId: string,
    interviewId: string,
    textResponse: string | null,
    audioUrl: string | null
) => {
    // Check if a response already exists
    const existingResponse = await prisma.response.findFirst({
        where: {
            questionId
        }
    });

    if (existingResponse) {
        // Update existing response
        return await prisma.response.update({
            where: {
                id: existingResponse.id
            },
            data: {
                textResponse,
                audioUrl,
                updatedAt: new Date()
            }
        });
    } else {
        // Create new response
        return await prisma.response.create({
            data: {
                questionId,
                interviewId,
                textResponse,
                audioUrl
            }
        });
    }
};

/**
 * Upload audio response to Azure Blob Storage
 */
export const uploadAudioResponse = async (
    userId: string,
    interviewId: string,
    questionId: string,
    audioBuffer: Buffer,
    fileName: string,
    mimeType: string
) => {
    // Get user container
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { container: true, clerkId: true }
    });

    if (!user || !user.container) {
        throw new Error("User container not found");
    }

    const containerName = user.container;

    // Ensure container exists
    await ensureUserContainer(containerName);

    // Upload audio file
    const audioPath = `interviews/${interviewId}/responses/${questionId}/${fileName}`;
    await uploadFile(
        containerName,
        audioPath,
        audioBuffer,
        parseInt(userId),
        null, // folderId
        fileName,
        mimeType,
        user.clerkId
    );

    // Return the URL to the audio file
    return `${containerName}/${audioPath}`;
};

/**
 * Generate feedback for an interview
 */
export const generateInterviewFeedback = async (interviewId: string) => {
    const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
            responses: true,
            jobType: true
        }
    });

    if (!interview) {
        throw new Error("Interview not found");
    }

    // In a real implementation, this would use AI to analyze responses
    // For now, create a simple mock feedback
    const feedback = await prisma.feedback.create({
        data: {
            interviewId,
            userId: interview.userId,
            overallScore: 75, // Mock score
            contentScore: 80,
            communicationScore: 70,
            behaviorScore: 75,
            confidenceScore: 65,
            clarityScore: 80,
            relevanceScore: 75,
            strengths: ["Good technical knowledge", "Clear communication"],
            areasToImprove: ["Could provide more concrete examples", "Sometimes hesitant when answering"],
            summary: `Overall, you did well in this ${interview.jobType.label} interview. Your technical knowledge was strong, and you communicated clearly. To improve, try to provide more specific examples from your experience and work on confidence in your responses.`
        }
    });

    // Mark interview as completed
    await updateInterviewStatus(
        interviewId,
        InterviewStatus.COMPLETED,
        interview.startedAt || new Date(),
        new Date()
    );

    return feedback;
};
