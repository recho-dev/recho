import {Prisma} from "@prisma/client";
import {prisma} from "../../../../lib/prisma.ts";
import {
  evaluationSessionWithRelations,
  jsonResponse,
  serializeEvaluationSession,
} from "../../../../lib/evaluation-db.ts";

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const session = await prisma.evaluationSession.findUnique({
      where: {id},
      ...evaluationSessionWithRelations,
    });

    if (!session) {
      return jsonResponse({error: "Evaluation not found"}, {status: 404});
    }

    return jsonResponse(serializeEvaluationSession(session));
  } catch (error) {
    console.error("Failed to read evaluation:", error);
    return jsonResponse({error: "Evaluation not found"}, {status: 404});
  }
}

export async function PUT(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const body = await request.json();

    const data: Prisma.EvaluationSessionUpdateInput = {};

    if (body.sessionEndTime != null) {
      data.sessionEndTime = new Date(body.sessionEndTime);
    }
    if (body.questionnaire !== undefined) {
      data.questionnaire = body.questionnaire === null ? Prisma.DbNull : (body.questionnaire as Prisma.InputJsonValue);
    }

    await prisma.evaluationSession.update({
      where: {id},
      data,
      select: {id: true},
    });

    return jsonResponse({ok: true});
  } catch (error) {
    console.error("Failed to update evaluation:", error);
    return jsonResponse({error: "Failed to update evaluation"}, {status: 500});
  }
}
