import assert from "node:assert/strict";
import { test } from "node:test";
import { buildVideoPayload, parseArgs, fetchPricingEstimate, createVideoTask, warnOrRequireSkillUpdate, checkSkillUpdate, MODELS } from "../scripts/lib/seedance-2-video.mjs";
const reference = { prompt: "A new nature scene", referenceVideoUrls: ["https://example.com/ref.mp4"] };
const rates = async () => new Response(JSON.stringify({data:[{model_name:MODELS.reference,base_usd_value:.1214,policies:[{rule:{resolution:{match:"1080p"}},usd_value:.4893}]}]}));
test("automatic duration is accepted only for reference mode, including aliases", () => {
 const options=parseArgs(["--model",MODELS.reference,"--prompt","x","--reference-video-url","https://example.com/ref.mp4","--duration","-1","--aspect-ratio","16:9","--no-web-search","--no-audio"]);
 const p=buildVideoPayload(options);
 assert.equal(p.input.duration,-1);assert.equal(p.input.web_search,false);assert.equal(p.input.generate_audio,false);
 assert.throws(()=>buildVideoPayload({prompt:"x",seconds:-1}));
 assert.throws(()=>buildVideoPayload({prompt:"x",firstFrameUrl:"https://example.com/i.png",seconds:-1}));
 assert.throws(()=>buildVideoPayload({...reference,model:MODELS.text}));
 assert.throws(()=>buildVideoPayload({...reference,seconds:0}));
});
test("rejects unsupported references and preserves first-frame asset support",()=>{
 for(const image of ["asset://ref","https://example.com/ref.heic","https://example.com/ref.svg","data:image/heif;base64,eA=="])
  assert.throws(()=>buildVideoPayload({...reference,referenceImageUrls:[image]}));
 assert.throws(()=>buildVideoPayload({...reference,referenceVideoUrls:["http://example.com/ref.mp4"]}));
 assert.equal(buildVideoPayload({prompt:"x",firstFrameUrl:"asset://first"}).input.first_frame_url,"asset://first");
 assert.throws(()=>buildVideoPayload({prompt:"x",firstFrameUrl:"asset://first",lastFrameUrl:"asset://last"}));
});
test("reference estimates include the reference and never multiply by -1",async()=>{
 const explicit=await fetchPricingEstimate(buildVideoPayload({...reference,seconds:5}),{fetchImpl:rates,referenceVideoDurations:[2]});
 assert.equal(explicit.estimatedUsd,.8498);
 const auto=await fetchPricingEstimate(buildVideoPayload({...reference,seconds:-1}),{fetchImpl:rates,referenceVideoDurations:[2]});
 assert.equal(auto.estimatedUsd,null);assert.deepEqual(auto.estimatedUsdRange,{minimum:.7284,maximum:3.8848});
 const unknown=await fetchPricingEstimate(buildVideoPayload({...reference,seconds:5}),{fetchImpl:rates});
 assert.equal(unknown.estimatedUsd,null);assert.deepEqual(unknown.estimatedUsdRange,{minimum:.8498,maximum:4.249});
 const high=await fetchPricingEstimate(buildVideoPayload({...reference,seconds:5,resolution:"1080p"}),{fetchImpl:rates,referenceVideoDurations:[2]});
 assert.equal(high.estimatedUsd,3.4251);
 assert.throws(()=>buildVideoPayload({...reference,referenceVideoDurations:[2,3]}));
});
test("new task gate blocks obsolete, unverified and disabled checks before any paid POST",async()=>{
 let posts=0;
 const future=async(_url,options)=>{if(options.method==="POST")posts++;return new Response(JSON.stringify({id:"hiapi-seedance-2-5-video",version:"1.3.0",updatePolicy:{latestVersion:"1.3.0",minimumVersion:"1.3.0"}}));};
 await assert.rejects(()=>createVideoTask(buildVideoPayload({prompt:"x"}),{apiKey:"fake",baseUrl:"https://example.com"},{fetchImpl:future}),/Update now/);
 assert.equal(posts,0);
 const unavailable={env:{},fetchImpl:async()=>{throw Error("offline")}};
 await assert.rejects(()=>warnOrRequireSkillUpdate(unavailable),/Could not verify/);
 assert.equal((await warnOrRequireSkillUpdate({...unavailable,allowRecovery:true})).status,"unverified");
 await assert.rejects(()=>warnOrRequireSkillUpdate({env:{HIAPI_SKIP_UPDATE_CHECK:"1"}}),/verification is disabled/);
 const malformed=await checkSkillUpdate({env:{},fetchImpl:async()=>new Response(JSON.stringify({id:"hiapi-seedance-2-5-video",updatePolicy:{latestVersion:"unknown",minimumVersion:"unknown"}}))});
 assert.equal(malformed.status,"unverified");
});
test("an available newer version also blocks new creation under the latest-only policy",async()=>{
 const fetchImpl=async()=>new Response(JSON.stringify({id:"hiapi-seedance-2-5-video",version:"1.3.0",updatePolicy:{latestVersion:"1.3.0",minimumVersion:"1.0.0"}}));
 await assert.rejects(()=>warnOrRequireSkillUpdate({env:{},fetchImpl}),/newer skill/);
 const recovery=await warnOrRequireSkillUpdate({env:{},fetchImpl,allowRecovery:true});
 assert.equal(recovery.status,"available");
});
