const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
function connection(value){
 if(!value)throw new Error('Set the required database connection environment variable.');
 const u=new URL(value);if(!['postgres:','postgresql:'].includes(u.protocol))throw new Error('A PostgreSQL connection URL is required.');
 const ssl=u.searchParams.get('sslmode');
 return {...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:decodeURIComponent(u.pathname.slice(1)),...(ssl?{PGSSLMODE:ssl}:{})};
}
function run(binary,args,env){
 const r=spawnSync(binary,args,{env,encoding:'utf8',maxBuffer:1024*1024});
 if(r.status!==0)throw new Error(binary+' failed. Check connectivity and use a PostgreSQL client compatible with the server. '+(r.stderr||'').replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted connection]').slice(0,1000));
 return r.stdout.trim();
}
function main(){
 const [action,filename]=process.argv.slice(2);
 if(!['backup','restore-check'].includes(action)||!filename)throw new Error('Usage: node scripts/database-ops.js backup|restore-check /absolute/path/backup.dump');
 const file=path.resolve(filename);
 if(action==='backup'){
  if(fs.existsSync(file))throw new Error('Refusing to overwrite an existing backup.');
  const env=connection(process.env.DATABASE_URL);
  // Reserve the path with private permissions before pg_dump opens it.
  fs.closeSync(fs.openSync(file,'wx',0o600));
  try{run('pg_dump',['--format=custom','--no-owner','--no-privileges','--file',file],env);}catch(error){fs.rmSync(file,{force:true});throw error;}
  console.log('Backup written to '+file);
 }else{
  if(!fs.statSync(file).isFile())throw new Error('Backup must be a regular file.');
  const env=connection(process.env.RESTORE_DATABASE_URL);
  if(!/^ilmio_restore_[a-z0-9_]+$/.test(env.PGDATABASE))throw new Error('Restore target must be a separate database named ilmio_restore_<label>.');
  if(run('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',"SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')"],env)!=='0')throw new Error('Restore target is not empty.');
  run('pg_restore',['--exit-on-error','--no-owner','--no-privileges','--dbname',env.PGDATABASE,file],env);
  const counts=run('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',`SELECT json_build_object('categories',(SELECT count(*) FROM "Category"),'products',(SELECT count(*) FROM "Product"),'menus',(SELECT count(*) FROM "MenuVersion"))`],env);
  console.log('Restore completed on the separate target: '+counts);
 }
}
try{main();}catch(error){console.error(error.message);process.exitCode=1;}
