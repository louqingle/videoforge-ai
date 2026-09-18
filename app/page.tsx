"use client";

import { useEffect, useRef, useState } from "react";

type Ratio = "9:16" | "16:9" | "1:1";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "success" | "failed">("idle");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function generate() {
    if (!prompt.trim() || status === "generating") return;
    setStatus("generating");
    setVideoUrl("");
    setError("");

    const res = await fetch("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim(), ratio })
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("failed");
      setError(data.error || "创建任务失败");
      return;
    }

    setTaskId(data.taskId);
    poll(data.taskId);
  }

  function poll(id: string) {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      const res = await fetch(`/api/video?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await res.json();

      if (data.status === "SUCCEEDED") {
        if (timer.current) clearInterval(timer.current);
        setVideoUrl(data.videoUrl || "");
        setStatus("success");
      } else if (data.status === "FAILED" || data.status === "CANCELED") {
        if (timer.current) clearInterval(timer.current);
        setStatus("failed");
        setError(data.error || "视频生成失败，请重试");
      }
    }, 4000);
  }

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand"><span className="logo">V</span> VideoForge <b>AI</b></div>
        <div className="navRight"><span>AI Video Studio</span><button className="ghost">登录</button></div>
      </nav>

      <section className="hero">
        <div className="eyebrow">AI VIDEO STUDIO</div>
        <h1>把一个想法，<span>变成视频。</span></h1>
        <p>输入一句话，AI 自动生成电影感短视频。</p>

        <div className="studio">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="例如：一只橘猫在东京雨夜的街头慢慢走过，霓虹灯倒映在湿漉漉的路面上，电影感，真实摄影..."
            maxLength={1800}
          />
          <div className="controls">
            <div className="ratios">
              <span>画幅</span>
              {(["9:16", "16:9", "1:1"] as Ratio[]).map(r => (
                <button key={r} className={ratio === r ? "ratio active" : "ratio"} onClick={() => setRatio(r)}>
                  {r}
                </button>
              ))}
            </div>
            <button className="generate" onClick={generate} disabled={!prompt.trim() || status === "generating"}>
              {status === "generating" ? "生成中…" : "✨ 开始生成"}
            </button>
          </div>
        </div>

        {status === "generating" && (
          <div className="progressCard">
            <div className="spinner" />
            <div>
              <strong>正在生成你的 AI 视频</strong>
              <p>视频生成通常需要一些时间，请不要关闭页面。</p>
            </div>
          </div>
        )}

        {status === "failed" && <div className="error">{error}</div>}

        {status === "success" && videoUrl && (
          <div className="result">
            <div className="resultHead"><strong>生成完成</strong><span>5 秒 · {ratio}</span></div>
            <video className={ratio === "9:16" ? "video vertical" : "video"} src={videoUrl} controls playsInline />
            <a className="download" href={videoUrl} target="_blank" rel="noreferrer">打开 / 保存视频</a>
          </div>
        )}
      </section>
      <footer>VideoForge AI · V1</footer>
    </main>
  );
}
