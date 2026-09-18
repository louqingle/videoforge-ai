import RunwayML from "@runwayml/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new RunwayML({
  apiKey: process.env.RUNWAYML_API_SECRET,
});

const ratios = {
  "9:16": "720:1280",
  "16:9": "1280:720",
  "1:1": "960:960",
} as const;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RUNWAYML_API_SECRET) {
      return NextResponse.json(
        { error: "服务器尚未配置 RUNWAYML_API_SECRET" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const prompt = String(body.prompt || "").trim();
    const ratio = body.ratio as keyof typeof ratios;

    if (!prompt) {
      return NextResponse.json({ error: "请输入视频描述" }, { status: 400 });
    }

    if (!ratios[ratio]) {
      return NextResponse.json({ error: "不支持的画幅" }, { status: 400 });
    }

    // Gen-4.5 supports text-to-video through the imageToVideo endpoint.
    // promptImage is intentionally omitted for pure text-to-video generation.
    const task = await client.imageToVideo.create({
      model: "gen4.5",
      promptText: prompt,
      ratio: ratios[ratio],
      duration: 5,
    });

    return NextResponse.json({ taskId: task.id });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "创建视频任务失败",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少 task id" }, { status: 400 });
    }

    const task = await client.tasks.retrieve(id);

    if (task.status === "SUCCEEDED") {
      return NextResponse.json({
        status: task.status,
        videoUrl: task.output[0] || "",
        error: "",
      });
    }

    if (task.status === "FAILED") {
      return NextResponse.json({
        status: task.status,
        videoUrl: "",
        error: task.failureCode || "视频生成失败",
      });
    }

    return NextResponse.json({
      status: task.status,
      videoUrl: "",
      error: "",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "查询任务失败",
      },
      { status: 500 }
    );
  }
}
