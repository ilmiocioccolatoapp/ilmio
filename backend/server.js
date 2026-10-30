require('dotenv').config();
const {createApp}=require('./app');
const app=createApp();
if(process.env.VERCEL!=='1')app.listen(process.env.PORT||5001,()=>console.log('Menu platform API started.'));
module.exports=app;
