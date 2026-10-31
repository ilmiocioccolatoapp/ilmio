const express=require('express');
const fs=require('fs');
const path=require('path');
const {corsMiddleware,securityHeaders}=require('./config/security');
const {createRouter}=require('./platform/router');
const {errors}=require('./platform/http');
const {logError}=require('./utils/errors');
const {performance}=require('perf_hooks');
const processStartedAt=performance.now();
function createApp({db=require('./config/prisma'),verifyIdentity,authClients}={}){
 const app=express();
 app.use((req,res,next)=>{req.appInstanceAgeMs=Math.round(performance.now()-processStartedAt);next();});
 if(process.env.TRUST_PROXY_HOPS)app.set('trust proxy',Number(process.env.TRUST_PROXY_HOPS));
 app.disable('x-powered-by');
 app.use(securityHeaders);app.use(corsMiddleware());
 app.use(express.json({limit:'1mb'}));
 app.use('/api',createRouter(db,verifyIdentity,authClients));
 const version=(req,res)=>{let manifest={version:'1.0.6',build:7,apkUrl:'',notes:''};try{manifest={...manifest,...JSON.parse(fs.readFileSync(path.join(__dirname,'app-version.json'),'utf8'))};}catch{}if(process.env.APP_VERSION)manifest.version=process.env.APP_VERSION;if(process.env.APP_BUILD)manifest.build=Number(process.env.APP_BUILD);if(process.env.APP_APK_URL)manifest.apkUrl=process.env.APP_APK_URL;res.json({success:true,data:manifest});};
 app.get(['/api/app-version','/api/app/version'],version);
 app.get('/healthz',async(req,res)=>{try{await db.$queryRaw`SELECT 1`;const monitor=await db.legacyRouteMonitor.findUnique({where:{id:'legacy-menu-v1'}});if(!monitor)throw new Error('Legacy monitor is missing.');if(!monitor.startedAt)await db.legacyRouteMonitor.updateMany({where:{id:monitor.id,startedAt:null},data:{startedAt:new Date()}});res.json({status:'ok'});}catch(error){logError('Health check failed',error);res.status(503).json({status:'unavailable'});}});
 app.get('/',(req,res)=>res.json({message:'Menu platform API',version:'2.0.0'}));
 app.use((req,res)=>res.status(404).type('application/problem+json').json({type:'about:blank',title:'Not found',status:404,detail:'Route not found.'}));
 app.use(errors);
 return app;
}
module.exports={createApp};
