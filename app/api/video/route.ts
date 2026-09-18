import { NextRequest, NextResponse } from "next/server";

const ARK_BASE_URL =
  process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";

// Seedance 2.0 standard model
const MODEL = "doubao-seedance-2-0-260128";

const allowedRatios = new Set(["9:16", "16:9", "1:1", "4:3", "3:4", "21:9", "adaptive"]);
const allowedResolutions = new Set(["480p", "720p", "1080p"]);

function headers() {
  return {
    Authorization: `Bearer ${process.env.ARK_API_KEY || ""}`,
    "Content-Type": "application/json",
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ARK_API_KEY) {
      return NextResponse.json({ error: "尚未配置 ARK_API_KEY。" }, { status: 500 });
    }

    const body = await req.json();
    const prompt = String(body.prompt || "").trim();
    const ratio = String(body.ratio || "9:16");
    const duration = Number(body.duration || 5);
    const resolution = String(body.resolution || "720p");
    const generateAudio = Boolean(body.generateAudio);

    if (!prompt) return NextResponse.json({ error: "请输入视频描述。" }, { status: 400 });
    if (!allowedRatios.has(ratio)) return NextResponse.json({ error: "不支持的画幅。" }, { status: 400 });
    if (!allowedResolutions.has(resolution)) return NextResponse.json({ error: "不支持的分辨率。" }, { status: 400 });
    if (!Number.isInteger(duration) || duration < 4 || duration > 15) {
      return NextResponse.json({ error: "Seedance 2.0 视频时长需要在 4～15 秒之间。" }, { status: 400 });
    }

    const response = await fetch(`${ARK_BASE_URL}/contents/generations/tasks`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model: MODEL,
        content: [{ type: "text", text: prompt }],
        ratio,
        duration,
        resolution,
        generate_audio: generateAudio,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("ARK create error:", data);
      return NextResponse.json(
        { error: data?.message || data?.error?.message || `火山方舟请求失败（HTTP ${response.status}）` },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 }
      );
    }

    const taskId = data?.id || data?.task_id;
    if (!taskId) {
      return NextResponse.json({ error: "火山方舟没有返回任务 ID。", detail: data }, { status: 502 });
    }

    return NextResponse.json({ taskId, model: MODEL });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建视频任务失败。" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!process.env.ARK_API_KEY) {
      return NextResponse.json({ error: "尚未配置 ARK_API_KEY。" }, { status: 500 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 task id。" }, { status: 400 });

    const response = await fetch(
      `${ARK_BASE_URL}/contents/generations/tasks/${encodeURIComponent(id)}`,
      { headers: headers(), cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || data?.error?.message || `查询任务失败（HTTP ${response.status}）` },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 }
      );
    }

    const status = String(data?.status || "queued").toLowerCase();
    const videoUrl =
      data?.content?.video_url ||
      data?.output?.video_url ||
      data?.video_url ||
      "";
    const error =
      data?.error?.message ||
      data?.error?.detail ||
      data?.message ||
      "";

    return NextResponse.json({ status, videoUrl, error, taskId: id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询视频任务失败。" },
      { status: 500 }
    );
  }
}
