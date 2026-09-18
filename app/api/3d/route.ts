import { NextRequest, NextResponse } from "next/server";

const BASE_URL="https://api.hyper3d.com/api/v2";
const auth=()=>({Authorization:`Bearer ${process.env.RODIN_API_KEY||""}`});

export async function POST(req:NextRequest){
  try{
    if(!process.env.RODIN_API_KEY)return NextResponse.json({error:"尚未配置 RODIN_API_KEY。"}, {status:500});
    const b=await req.json(), prompt=String(b.prompt||"").trim(), quality=String(b.quality||"medium"), format=String(b.format||"glb");
    if(!prompt)return NextResponse.json({error:"请输入 3D 模型描述。"},{status:400});
    if(prompt.length>1024)return NextResponse.json({error:"3D 描述最多 1024 个字符。"},{status:400});
    if(!["high","medium","low"].includes(quality))return NextResponse.json({error:"不支持的模型质量。"}, {status:400});
    if(!["glb","usdz","fbx","obj","stl"].includes(format))return NextResponse.json({error:"不支持的模型格式。"}, {status:400});
    const form=new FormData();
    form.append("prompt",prompt); form.append("tier","Gen-2"); form.append("mesh_mode","Quad");
    form.append("quality",quality); form.append("geometry_file_format",format); form.append("material","PBR");
    const r=await fetch(`${BASE_URL}/rodin`,{method:"POST",headers:auth(),body:form,cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d?.error||!d?.uuid||!d?.jobs?.subscription_key){
      return NextResponse.json({error:d?.message||d?.error||`Hyper3D 请求失败（HTTP ${r.status}）`},{status:r.status>=400&&r.status<500?r.status:502});
    }
    return NextResponse.json({taskId:d.uuid,subscriptionKey:d.jobs.subscription_key,model:"Hyper3D Rodin Gen-2"});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"创建 3D 任务失败。"}, {status:500});}
}

export async function GET(req:NextRequest){
  try{
    if(!process.env.RODIN_API_KEY)return NextResponse.json({error:"尚未配置 RODIN_API_KEY。"}, {status:500});
    const key=req.nextUrl.searchParams.get("key"), task=req.nextUrl.searchParams.get("task");
    if(!key||!task)return NextResponse.json({error:"缺少 3D 任务参数。"},{status:400});
    const r=await fetch(`${BASE_URL}/status`,{method:"POST",headers:{...auth(),"Content-Type":"application/json"},body:JSON.stringify({subscription_key:key}),cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return NextResponse.json({error:d?.message||d?.error||"查询 3D 任务失败。"}, {status:r.status>=400&&r.status<500?r.status:502});
    const jobs=Array.isArray(d?.jobs)?d.jobs:[], failed=jobs.some((j:any)=>String(j.status||"").toLowerCase()==="failed"), done=jobs.length>0&&jobs.every((j:any)=>String(j.status||"").toLowerCase()==="done");
    if(failed)return NextResponse.json({status:"failed",error:jobs.find((j:any)=>String(j.status||"").toLowerCase()==="failed")?.message||"3D 模型生成失败。",taskId:task});
    if(!done)return NextResponse.json({status:String(jobs[0]?.status||"queued").toLowerCase(),taskId:task});
    const dr=await fetch(`${BASE_URL}/download`,{method:"POST",headers:{...auth(),"Content-Type":"application/json"},body:JSON.stringify({task_uuid:task}),cache:"no-store"});
    const dd=await dr.json().catch(()=>({}));
    if(!dr.ok)return NextResponse.json({error:dd?.message||dd?.error||"获取 3D 下载地址失败。"},{status:502});
    const files=Array.isArray(dd?.list)?dd.list.map((x:any)=>({name:x.name||"model",url:x.url||""})).filter((x:any)=>x.url):[];
    return NextResponse.json({status:"success",taskId:task,files});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"查询 3D 任务失败。"}, {status:500});}
}