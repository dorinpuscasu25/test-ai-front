import prisma from "@/config/database/connection/sql.connection";
import {auth} from "@clerk/nextjs/server";
import {
  DashboardData,
  StorageStatsData,
  WorkflowStatsData,
  ChartDataPoint,
  PlatformROIData,
  AssistantStatsData,
  ChatStatsData,
  TimeStatsData,
  AgentStat,
  AgentUsagePercentage,
} from "@/components/analytics/types";
import {assistants} from "@/data/assistantList";
import aiDatabaseService from "@/config/database/connection/cosmos.connection";

const DEFAULT_TIME_SAVED_MULTIPLIER = Number(process.env.DEFAULT_TIME_SAVED_MULTIPLIER || "20");
const DEFAULT_HOURLY_COST_MULTIPLIER = Number(process.env.DEFAULT_HOURLY_COST_MULTIPLIER || "50");

const agentMultipliers: Record<string, {timeSaved: number; hourlyCost: number}> = {
  "Requirement Analyser": {
    timeSaved: Number(process.env.REQUIREMENT_ANALYSER_TIME_SAVED || DEFAULT_TIME_SAVED_MULTIPLIER),
    hourlyCost: Number(
      process.env.REQUIREMENT_ANALYSER_HOURLY_COST || DEFAULT_HOURLY_COST_MULTIPLIER,
    ),
  },
  "Test Case Generator": {
    timeSaved: Number(process.env.TEST_CASE_GENERATOR_TIME_SAVED || DEFAULT_TIME_SAVED_MULTIPLIER),
    hourlyCost: Number(
      process.env.TEST_CASE_GENERATOR_HOURLY_COST || DEFAULT_HOURLY_COST_MULTIPLIER,
    ),
  },
  "Test Data Generator": {
    timeSaved: Number(process.env.TEST_DATA_GENERATOR_TIME_SAVED || DEFAULT_TIME_SAVED_MULTIPLIER),
    hourlyCost: Number(
      process.env.TEST_DATA_GENERATOR_HOURLY_COST || DEFAULT_HOURLY_COST_MULTIPLIER,
    ),
  },
  "Automation Scripts Generator": {
    timeSaved: Number(
      process.env.TEST_AUTOMATION_GENERATOR_TIME_SAVED || DEFAULT_TIME_SAVED_MULTIPLIER,
    ),
    hourlyCost: Number(
      process.env.TEST_AUTOMATION_GENERATOR_HOURLY_COST || DEFAULT_HOURLY_COST_MULTIPLIER,
    ),
  },
};

function getAgentMultipliers(agentName: string): {timeSaved: number; hourlyCost: number} {
  return (
    agentMultipliers[agentName] || {
      timeSaved: DEFAULT_TIME_SAVED_MULTIPLIER,
      hourlyCost: DEFAULT_HOURLY_COST_MULTIPLIER,
    }
  );
}

export async function getAnalyticsData(): Promise<DashboardData> {
  try {
    const {userId} = await auth();

    if (!userId) {
      throw new Error("User not found");
    }

    const user = await prisma.user.findUnique({
      where: {clerkId: userId},
      select: {id: true},
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const prevPeriodEndDate = new Date(startDate);
    const prevPeriodStartDate = new Date(startDate);
    prevPeriodStartDate.setDate(prevPeriodStartDate.getDate() - 30);

    const storageStats = await getStorageStats(userId);
    const workflowStats = await getWorkflowStats(userId, startDate, endDate);
    const chatStats = await calculateChatStatsFromAnalytics(
      userId,
      startDate,
      endDate,
      prevPeriodStartDate,
      prevPeriodEndDate,
    );
    const timeStats = await calculateTimeStatsFromAnalytics(userId, startDate, endDate);

    const cosmosData = await getCosmosAnalyticsData(
      startDate,
      endDate,
      prevPeriodStartDate,
      prevPeriodEndDate,
      userId,
    );

    const assistantStats = await calculateAssistantStatsFromCosmos(
      startDate,
      endDate,
      prevPeriodStartDate,
      prevPeriodEndDate,
    );

    let totalCostSaved = 0;
    let totalTimeSaved = 0;

    cosmosData.agentStatss.forEach((agent) => {
      if (agent.costSaved) totalCostSaved += agent.costSaved;
      if (agent.timeSaved) totalTimeSaved += agent.timeSaved;
    });

    const platformROI: PlatformROIData = {
      totalSavings: totalCostSaved,
      timeSavedHours: totalTimeSaved,
      percentageChange: {
        value: 0,
        upOrDown: "up",
      },
    };

    if (cosmosData.previousPeriod) {
      const prevTotal = cosmosData.previousPeriod.totalCostSaved;
      if (prevTotal > 0) {
        const change = totalCostSaved - prevTotal;
        platformROI.percentageChange = {
          value: Math.round(Math.abs((change / prevTotal) * 100)),
          upOrDown: change >= 0 ? "up" : "down",
        };
      } else if (totalCostSaved > 0) {
        platformROI.percentageChange = {
          value: 100,
          upOrDown: "up",
        };
      }
    }

    return {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      platformROI,
      assistantStats,
      chatStats,
      timeStats,
      agentStatss: cosmosData.agentStatss,
      agentUsagePercentages: cosmosData.agentUsagePercentages,
      storageStats,
      workflowStats,
    };
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    throw new Error("Failed to fetch analytics data");
  }
}

async function calculateAssistantStatsFromCosmos(
  startDate: Date,
  endDate: Date,
  prevPeriodStartDate: Date,
  prevPeriodEndDate: Date,
): Promise<AssistantStatsData> {
  try {
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    const prevStartDateStr = prevPeriodStartDate.toISOString();
    const prevEndDateStr = prevPeriodEndDate.toISOString();

    const assistantContainers = assistants
      .filter((a) => a.containerName)
      .map((a) => a.containerName as string);

    const assistantCounts: Record<string, number> = {};
    let totalCurrentCount = 0;
    let totalPreviousCount = 0;

    for (const containerName of assistantContainers) {
      try {
        await aiDatabaseService.init(containerName);

        let currentQuery = "";
        let prevQuery = "";

        if (containerName === "requirement-analysis") {
          currentQuery = `
          SELECT VALUE COUNT(1)
          FROM c
          JOIN RequirementAnalysis IN c.jsonContent.RequirementAnalysis
          WHERE c.metadata.DateTime >= '${startDateStr}' AND c.metadata.DateTime <= '${endDateStr}'
          `;

          prevQuery = `
          SELECT VALUE COUNT(1)
          FROM c
          JOIN RequirementAnalysis IN c.jsonContent.RequirementAnalysis
          WHERE c.metadata.DateTime >= '${prevStartDateStr}' AND c.metadata.DateTime <= '${prevEndDateStr}'
          `;
        } else {
          currentQuery = `
          SELECT VALUE COUNT(1)
          FROM c
          JOIN scenario IN c.jsonContent.GeneratedTestScenarios
          JOIN testCase IN scenario.TestCases
          WHERE c.metadata.DateTime >= '${startDateStr}' AND c.metadata.DateTime <= '${endDateStr}'
          `;

          prevQuery = `
          SELECT VALUE COUNT(1)
          FROM c
          JOIN scenario IN c.jsonContent.GeneratedTestScenarios
          JOIN testCase IN scenario.TestCases
          WHERE c.metadata.DateTime >= '${prevStartDateStr}' AND c.metadata.DateTime <= '${prevEndDateStr}'
          `;
        }

        const currentQueryResults = await aiDatabaseService.getItems<any>(
          currentQuery,
          containerName,
        );
        const currentCount = currentQueryResults[0] || 0;

        const prevQueryResults = await aiDatabaseService.getItems<any>(prevQuery, containerName);
        const prevCount = prevQueryResults[0] || 0;

        const assistant = assistants.find((a) => a.containerName === containerName);
        if (assistant) {
          assistantCounts[assistant.name] = currentCount;
          totalCurrentCount += currentCount;
          totalPreviousCount += prevCount;
        }
      } catch (error) {
        console.error(`Error querying container ${containerName}:`, error);
      }
    }

    const assistantsArray = Object.entries(assistantCounts).map(([name, count]) => ({
      name,
      percentage: totalCurrentCount > 0 ? Math.round((count / totalCurrentCount) * 100) : 0,
    }));

    const percentageChange = {
      upOrDown: totalCurrentCount >= totalPreviousCount ? ("up" as const) : ("down" as const),
      value: 0,
    };

    if (totalPreviousCount > 0) {
      const change = ((totalCurrentCount - totalPreviousCount) / totalPreviousCount) * 100;
      percentageChange.value = Math.round(Math.abs(change));
    } else if (totalCurrentCount > 0) {
      percentageChange.value = 100;
    }

    return {
      assistants: assistantsArray,
      percentageChange,
    };
  } catch (error) {
    console.error("Error calculating assistant stats from Cosmos:", error);
    return {
      assistants: [],
      percentageChange: {upOrDown: "up", value: 0},
    };
  }
}

async function calculateChatStatsFromAnalytics(
  userId: string,
  startDate: Date,
  endDate: Date,
  prevPeriodStartDate: Date,
  prevPeriodEndDate: Date,
): Promise<ChatStatsData> {
  try {
    const chatAnalytics = await prisma.analytics.findMany({
      where: {
        userId,
        eventType: "chat_message",
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const uniqueChats = new Set();

    chatAnalytics.forEach((analytic) => {
      const metadata = analytic.metadata as any;
      if (metadata?.chatId) {
        uniqueChats.add(metadata.chatId);
      } else if (analytic.entityId) {
        uniqueChats.add(analytic.entityId);
      }
    });

    const totalActive = uniqueChats.size;

    const totalMessages = chatAnalytics.length;

    const averagePerChat = totalActive > 0 ? Math.round(totalMessages / totalActive) : 0;

    const prevPeriodAnalytics = await prisma.analytics.findMany({
      where: {
        userId,
        eventType: "chat_message",
        timestamp: {
          gte: prevPeriodStartDate,
          lte: prevPeriodEndDate,
        },
      },
    });

    const prevPeriodUniqueChats = new Set();
    prevPeriodAnalytics.forEach((analytic) => {
      const metadata = analytic.metadata as any;
      if (metadata?.chatId) {
        prevPeriodUniqueChats.add(metadata.chatId);
      } else if (analytic.entityId) {
        prevPeriodUniqueChats.add(analytic.entityId);
      }
    });

    const newPerPeriod = Math.max(0, totalActive - prevPeriodUniqueChats.size);

    const histogramData = new Map<string, {count: number; date: string}>();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = currentDate.getDate().toString();
      const fullDate = currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      histogramData.set(dateKey, {count: 0, date: fullDate});
      currentDate.setDate(currentDate.getDate() + 1);
    }

    chatAnalytics.forEach((analytic) => {
      const date = new Date(analytic.timestamp);
      const dateKey = date.getDate().toString();
      const fullDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const existingData = histogramData.get(dateKey);
      if (existingData) {
        existingData.count += 1;
      } else {
        histogramData.set(dateKey, {count: 1, date: fullDate});
      }
    });

    const histogram = Array.from(histogramData.entries()).map(([label, {count, date}]) => ({
      label,
      count,
      date,
    }));

    histogram.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    return {
      totalActive,
      newPerPeriod,
      messages: totalMessages,
      averagePerChat,
      histogram,
    };
  } catch (error) {
    console.error("Error calculating chat stats:", error);
    return {
      totalActive: 0,
      newPerPeriod: 0,
      messages: 0,
      averagePerChat: 0,
      histogram: [],
    };
  }
}

async function calculateTimeStatsFromAnalytics(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<TimeStatsData> {
  try {
    const timeAnalytics = await prisma.analytics.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    const lastActive =
      timeAnalytics.length > 0
        ? Math.round(
            (new Date().getTime() - new Date(timeAnalytics[0].timestamp).getTime()) /
              (1000 * 60 * 60),
          )
        : 0;

    const actionsPerPeriod = timeAnalytics.length;

    const chartData = new Map<string, {value: number; date: string}>();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = currentDate.getDate().toString();
      const fullDate = currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      chartData.set(dateKey, {value: 0, date: fullDate});
      currentDate.setDate(currentDate.getDate() + 1);
    }

    timeAnalytics.forEach((analytic) => {
      const date = new Date(analytic.timestamp);
      const dateKey = date.getDate().toString();
      const fullDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const existingData = chartData.get(dateKey);
      if (existingData) {
        existingData.value += 1;
      } else {
        chartData.set(dateKey, {value: 1, date: fullDate});
      }
    });

    const chart = Array.from(chartData.entries()).map(([label, {value, date}]) => ({
      label,
      value,
      date,
    }));

    chart.sort((a, b) => {
      const dateA = new Date(a.date || "");
      const dateB = new Date(b.date || "");
      return dateA.getTime() - dateB.getTime();
    });

    const tooltipPoint =
      chart.length > 0 ? chart[Math.floor(chart.length / 2)] : {label: "", value: 0, date: ""};

    return {
      lastActive,
      actionsPerPeriod,
      periodLabel: "Last 30 days",
      chart,
      tooltip: {
        label: tooltipPoint.date || "",
        value: tooltipPoint.value,
      },
    };
  } catch (error) {
    console.error("Error calculating time stats:", error);
    return {
      lastActive: 0,
      actionsPerPeriod: 0,
      periodLabel: "Last 30 days",
      chart: [],
    };
  }
}

async function getCosmosAnalyticsData(
  startDate: Date,
  endDate: Date,
  prevPeriodStartDate: Date,
  prevPeriodEndDate: Date,
  userId: string,
): Promise<{
  agentStatss: AgentStat[];
  agentUsagePercentages: AgentUsagePercentage[];
  previousPeriod?: {
    totalCostSaved: number;
    totalTimeSaved: number;
  };
}> {
  try {
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    const prevStartDateStr = prevPeriodStartDate.toISOString();
    const prevEndDateStr = prevPeriodEndDate.toISOString();

    const assistantContainers = assistants
      .filter((a) => a.containerName)
      .map((a) => a.containerName as string);

    const results = {
      agentStatss: [] as AgentStat[],
      agentUsagePercentages: [] as AgentUsagePercentage[],
    };

    let totalUsage = 0;
    const agentCounts: Record<string, number> = {};
    let previousPeriodTotalCostSaved = 0;
    let previousPeriodTotalTimeSaved = 0;

    for (const containerName of assistantContainers) {
      try {
        await aiDatabaseService.init(containerName);

        let currentQuery = "";
        let prevQuery = "";

        if (containerName == "requirement-analysis") {
          currentQuery = `
          SELECT VALUE COUNT(1)
          FROM c
          JOIN RequirementAnalysis IN c.jsonContent.RequirementAnalysis
          WHERE c.metadata.DateTime >= '${startDateStr}' AND c.metadata.DateTime <= '${endDateStr}' 
          AND c.metadata.UserId = '${userId}'
        `;

          prevQuery = `
          SELECT VALUE COUNT(1)
          FROM c
          JOIN RequirementAnalysis IN c.jsonContent.RequirementAnalysis
          WHERE c.metadata.DateTime >= '${prevStartDateStr}' AND c.metadata.DateTime <= '${prevEndDateStr}'
            AND c.metadata.UserId = '${userId}'
        `;
        } else {
          currentQuery = `
          SELECT VALUE COUNT(1)
          FROM c
          JOIN scenario IN c.jsonContent.GeneratedTestScenarios
          JOIN testCase IN scenario.TestCases
          WHERE c.metadata.DateTime >= '${startDateStr}' AND c.metadata.DateTime <= '${endDateStr}'
            AND c.metadata.UserId = '${userId}'
        `;
          prevQuery = `
          SELECT VALUE COUNT(1)
          FROM c
          JOIN scenario IN c.jsonContent.GeneratedTestScenarios
          JOIN testCase IN scenario.TestCases
          WHERE c.metadata.DateTime >= '${prevStartDateStr}' AND c.metadata.DateTime <= '${prevEndDateStr}'
            AND c.metadata.UserId = '${userId}'
        `;
        }

        const currentQueryResults = await aiDatabaseService.getItems<any>(
          currentQuery,
          containerName,
        );
        const currentCount = currentQueryResults[0] || 0;

        const prevQueryResults = await aiDatabaseService.getItems<any>(prevQuery, containerName);
        const prevCount = prevQueryResults[0] || 0;

        const assistant = assistants.find((a) => a.containerName === containerName);

        if (assistant) {
          agentCounts[containerName] = currentCount;
          totalUsage += currentCount;

          let percentageChange = 0;
          let upOrDown: "up" | "down" = "up";

          if (prevCount > 0) {
            const change = currentCount - prevCount;
            percentageChange = Math.round(Math.abs((change / prevCount) * 100));
            upOrDown = change >= 0 ? "up" : "down";
          } else if (currentCount > 0) {
            percentageChange = 100;
            upOrDown = "up";
          }

          const {timeSaved: timeSavedMultiplier, hourlyCost: hourlyCostMultiplier} =
            getAgentMultipliers(assistant.name);

          const timeSaved = currentCount * timeSavedMultiplier;
          const costSaved = timeSaved * hourlyCostMultiplier;

          const prevTimeSaved = prevCount * timeSavedMultiplier;
          const prevCostSaved = prevTimeSaved * hourlyCostMultiplier;

          previousPeriodTotalTimeSaved += prevTimeSaved;
          previousPeriodTotalCostSaved += prevCostSaved;

          results.agentStatss.push({
            name: assistant.name,
            messageCount: currentCount,
            percentageChange: {
              upOrDown,
              value: percentageChange,
            },
            timeSaved: timeSaved,
            costSaved: Math.round(costSaved),
            timeSavedMultiplier,
            hourlyCostMultiplier,
          });
        }
      } catch (error) {
        console.error(`Error querying container ${containerName}:`, error);
      }
    }

    if (totalUsage > 0) {
      const colorMap: Record<string, string> = {
        "test-cases": "#4682B4",
        "test-automation-scripts": "#5BC0DE",
        "requirement-analysis": "#586994",
        "test-data-generator": "#77DD77",
      };

      for (const [containerName, count] of Object.entries(agentCounts)) {
        const percentage = Math.round((count / totalUsage) * 100);

        results.agentUsagePercentages.push({
          name: containerName,
          percentage: percentage,
          color: colorMap[containerName] || "#AAAAAA",
        });
      }
    }

    return {
      agentStatss: results.agentStatss,
      agentUsagePercentages: results.agentUsagePercentages,
      previousPeriod: {
        totalCostSaved: Math.round(previousPeriodTotalCostSaved),
        totalTimeSaved: previousPeriodTotalTimeSaved,
      },
    };
  } catch (error) {
    console.error("Error fetching Cosmos analytics data:", error);
    return {
      agentStatss: [],
      agentUsagePercentages: [],
    };
  }
}

async function getStorageStats(clerkId: string): Promise<StorageStatsData> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: {clerkId},
      select: {
        knowbaseStorageUsed: true,
        knowbaseStorageAllowance: true,
      },
    });

    if (!subscription) {
      return {
        knowledgeBaseUsed: 0,
        knowledgeBaseTotal: 0,
      };
    }

    return {
      knowledgeBaseUsed: subscription.knowbaseStorageUsed,
      knowledgeBaseTotal: subscription.knowbaseStorageAllowance,
      percentageUsed:
        subscription.knowbaseStorageAllowance > 0
          ? Math.round(
              (subscription.knowbaseStorageUsed / subscription.knowbaseStorageAllowance) * 100,
            )
          : 0,
    };
  } catch (error) {
    console.error("Error fetching storage stats:", error);
    return {
      knowledgeBaseUsed: 0,
      knowledgeBaseTotal: 0,
    };
  }
}

async function getWorkflowStats(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<WorkflowStatsData> {
  try {
    const totalActiveWorkflows = await prisma.analytics.count({
      where: {
        userId,
        eventType: "workflow_create",
      },
    });

    const workflowRuns = await prisma.analytics.findMany({
      where: {
        userId: userId,
        eventType: "workflow_run",
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    const totalRuns = workflowRuns.length;

    const dailyRuns = calculateDailyWorkflowRuns(workflowRuns, startDate, endDate);

    const newWorkflowsLastMonth = await prisma.analytics.count({
      where: {
        userId,
        eventType: "workflow_create",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      totalActive: totalActiveWorkflows,
      totalRuns,
      averageNewPerPeriod: newWorkflowsLastMonth,
      periodLabel: "month",
      chart: dailyRuns,
    };
  } catch (error) {
    console.error("Error fetching workflow stats:", error);
    return {
      totalActive: 0,
      totalRuns: 0,
      averageNewPerPeriod: 0,
      periodLabel: "month",
      chart: [],
    };
  }
}

function calculateDailyWorkflowRuns(
  workflowRuns: any[],
  startDate: Date,
  endDate: Date,
): ChartDataPoint[] {
  const dailyRunsMap = new Map<string, number>();

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0];
    dailyRunsMap.set(dateKey, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  workflowRuns.forEach((run) => {
    const dateKey = new Date(run.timestamp).toISOString().split("T")[0];
    const currentCount = dailyRunsMap.get(dateKey) || 0;
    dailyRunsMap.set(dateKey, currentCount + 1);
  });

  const chartData: ChartDataPoint[] = [];
  dailyRunsMap.forEach((count, dateStr) => {
    const date = new Date(dateStr);
    chartData.push({
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      value: count,
    });
  });

  return chartData;
}
