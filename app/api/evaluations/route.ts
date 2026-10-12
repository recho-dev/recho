import {prisma} from "../../../lib/prisma.ts";
import {
  evaluationSessionWithRelations,
  jsonResponse,
  serializeEvaluationSession,
  serializeEvaluationSummary,
} from "../../../lib/evaluation-db.ts";

export async function GET() {
  try {
    const sessions = await prisma.evaluationSession.findMany({
      select: {
        id: true,
        participantName: true,
        participantId: true,
        sessionStartTime: true,
        sessionEndTime: true,
        questionnaire: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        sessionStartTime: "desc",
      },
    });

    return jsonResponse(sessions.map(serializeEvaluationSummary));
  } catch (error) {
    console.error("Failed to list evaluations:", error);
    return jsonResponse({error: "Failed to list evaluations"}, {status: 500});
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const participantName = typeof body.participantName === "string" ? body.participantName.trim() : "";
    const participantId = Number(body.participantId);

    if (!participantName || !Number.isInteger(participantId) || participantId < 1) {
      return jsonResponse({error: "Invalid participant information"}, {status: 400});
    }

    const existingSession = await prisma.evaluationSession.findFirst({
      where: {
        participantId,
        sessionEndTime: null,
      },
      orderBy: {
        sessionStartTime: "desc",
      },
      ...evaluationSessionWithRelations,
    });

    if (existingSession) {
      return jsonResponse({
        id: existingSession.id,
        resumed: true,
        session: serializeEvaluationSession(existingSession),
      });
    }

    const session = await prisma.evaluationSession.create({
      data: {
        participantName,
        participantId,
        sessionStartTime: new Date(),
      },
      select: {
        id: true,
      },
    });

    return jsonResponse({id: session.id, resumed: false}, {status: 201});
  } catch (error) {
    console.error("Failed to create evaluation:", error);
    return jsonResponse({error: "Failed to create evaluation"}, {status: 500});
  }
}
