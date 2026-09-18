"use client";

import { useEffect, useRef, useState } from "react";

type Ratio = "9:16" | "16:9" | "1:1";
type Resolution = "720p" | "1080p";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState<Resolution>("720p");
  const [audio, setAudio] = useState(true);
  const [status, setStatus] = useState<"idle" | "generating" | "success" | "failed">("idle");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function generate() {
    if (!prompt.trim() || status === "generating") return;
    setStatus("generating");
    setVideoUrl("");
    setError("");
    setProgress(5);

    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), ratio, duration, resolution, generateAudio: audio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建任务失败");
      poll(data.taskId);
    } catch (e) {
      setStatus("failed");
      setError(e instanceof Error ? e.message : "创建任务失败");
    }
  }

  function poll(id: string) {
    if (timer.current) clearInterval(timer.current);
    let checks = 0;
    timer.current = setInterval(async () => {
      checks += 1;
      setProgress(Math.min(92, 8 + checks * 3));
      try {
        const res = await fetch(`/api/video?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "查询任务失败");

        if (data.status === "succeeded" || data.status === "success") {
          if (timer.current) clearInterval(timer.current);
          setProgress(100);
          setVideoUrl(data.videoUrl || "");
          setStatus(data.videoUrl ? "success" : "failed");
          if (!data.videoUrl) setError("任务成功但没有返回视频地址，请稍后重试。");
        } else if (["failed", "cancelled", "expired"].includes(data.status)) {
          if (timer.current) clearInterval(timer.current);
          setStatus("failed");
          setError(data.error || "视频生成失败，请重试。");
        }
      } catch (e) {
        if (timer.current) clearInterval(timer.current);
        setStatus("failed");
        setError(e instanceof Error ? e.message : "查询任务失败");
      }
    }, 5000);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand"><span className="mark">V</span><span>VideoForge</span><em>AI</em></div>
        <div className="topMeta"><span>SEEDANCE 2.0</span><span className="dot" /><span>AI VIDEO STUDIO</span></div>
      </header>

      <section className="hero">
        <div className="pill">POWERED BY SEEDANCE 2.0</div>
        <h1>你的想法，<span>直接变成视频</span></h1>
        <p>输入一句描述，生成电影感 AI 视频。</p>

        <div className="workspace">
          <div className="promptTop"><span>VIDEO PROMPT</span><span>{prompt.length}/2000</span></div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            placeholder="例如：雨夜东京街头，一名年轻人撑着黑色雨伞缓慢走过，霓虹灯映在湿润路面，手持电影摄影机跟拍，真实光影，浅景深……"
          />

          <div className="settings">
            <div className="setting">
              <label>画幅</label>
              <div className="seg">
                {(["9:16", "16:9", "1:1"] as Ratio[]).map((x) => (
                  <button key={x} className={ratio === x ? "on" : ""} onClick={() => setRatio(x)}>{x}</button>
                ))}
              </div>
            </div>
            <div className="setting">
              <label>时长</label>
              <div className="seg">
                {[5, 10, 15].map((x) => (
                  <button key={x} className={duration === x ? "on" : ""} onClick={() => setDuration(x)}>{x}s</button>
                ))}
              </div>
            </div>
            <div className="setting">
              <label>清晰度</label>
              <div className="seg">
                {(["720p", "1080p"] as Resolution[]).map((x) => (
                  <button key={x} className={resolution === x ? "on" : ""} onClick={() => setResolution(x)}>{x}</button>
                ))}
              </div>
            </div>
            <div className="setting">
              <label>声音</label>
              <button className={audio ? "audio on" : "audio"} onClick={() => setAudio(!audio)}>{audio ? "● 开启" : "○ 关闭"}</button>
            </div>
          </div>

          <button className="generate" onClick={generate} disabled={!prompt.trim() || status === "generating"}>
            {status === "generating" ? `正在生成 · ${progress}%` : "生成视频  →"}
          </button>
        </div>

        {status === "generating" && (
          <div className="statusCard">
            <div className="loader" />
            <div className="statusText"><strong>正在生成视频</strong><span>Seedance 2.0 正在渲染，请保持页面打开。</span></div>
            <div className="bar"><i style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        {status === "failed" && <div className="errorCard">{error}</div>}

        {status === "success" && videoUrl && (
          <div className="resultCard">
            <div className="resultTitle"><strong>生成完成</strong><span>{duration}s · {resolution} · {ratio}</span></div>
            <video src={videoUrl} controls playsInline className={ratio === "9:16" ? "video portrait" : "video"} />
            <a href={videoUrl} target="_blank" rel="noreferrer" className="save">打开视频 / 保存到设备</a>
          </div>
        )}

        <div className="examples">
          <span>试试这些：</span>
          {["赛博朋克城市夜景", "一只猫在海边奔跑", "高端产品广告片"].map((x) => (
            <button key={x} onClick={() => setPrompt(x)}>{x}</button>
          ))}
        </div>
      </section>

      <footer><span>VideoForge AI</span><span>Seedance 2.0</span><span>© 2026</span></footer>
    </main>
  );
}
