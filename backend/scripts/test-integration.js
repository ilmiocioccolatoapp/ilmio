// Creates and destroys its own local PostgreSQL cluster. Never reads DATABASE_URL.
const {mkdtempSync,rmSync,writeFileSync}=require('fs');
const {tmpdir}=require('os');
const path=require('path');
const {spawnSync}=require('child_process');
const net=require('net');
function run(cmd,args,env=process.env){const r=spawnSync(cmd,args,{cwd:path.join(__dirname,'..'),env,encoding:'utf8',stdio:'pipe'});if(r.status!==0)throw new Error(cmd+' failed: '+r.stderr+'\n'+r.stdout);return r.stdout;}
(async()=>{
 const scratch=mkdtempSync(path.join(tmpdir(),'ilmio-platform-test-'));
 let started=false;
 const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));
 try{
  run('initdb',['-D',path.join(scratch,'data'),'-A','trust','--no-locale','-E','UTF8']);
  run('pg_ctl',['-D',path.join(scratch,'data'),'-l',path.join(scratch,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -k '+scratch,'-w','start']);started=true;
  run('createdb',['-h','127.0.0.1','-p',String(port),'ilmio_test_platform']);
  const url='postgresql://'+require('os').userInfo().username+'@127.0.0.1:'+port+'/ilmio_test_platform';
  const env={...process.env,DATABASE_URL:url,TEST_DATABASE_URL:url,STORE_JWT_SECRET:'local-test-only-store-secret-32-characters',NODE_ENV:'test'};
  // Simulate adopting migrations on an existing installation, with original IDs.
  run('psql',[url,'-v','ON_ERROR_STOP=1','-f','prisma/migrations/202610300001_baseline/migration.sql'],env);
  const fixture=path.join(scratch,'fixture.sql');
  writeFileSync(fixture,`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$; CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ DECLARE cmd record; BEGIN FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') AND object_type IN ('table','partitioned table') LOOP IF cmd.schema_name='public' THEN EXECUTE format('ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY',cmd.object_identity); END IF; END LOOP; END $$; CREATE EVENT TRIGGER ensure_rls ON ddl_command_end WHEN TAG IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') EXECUTE FUNCTION public.rls_auto_enable(); INSERT INTO "Category" ("dbId","id","name","icon","order","updatedAt") VALUES ('existing-category','drinks','Drinks','☕',2,NOW()); INSERT INTO "Product" ("dbId","title","category","image","description","ingredients","price","updatedAt") VALUES ('existing-product','Original Cocoa','drinks','https://example.test/cocoa.jpg','Original description','Milk and cocoa','AED 12.50',NOW());`);
  run('psql',[url,'-v','ON_ERROR_STOP=1','-f',fixture],env);
  run(process.execPath,['node_modules/prisma/build/index.js','migrate','resolve','--applied','202610300001_baseline'],env);
  try { run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],env); }
  catch (error) {
   // If the first data migration rolled back, psql exposes its original SQL
   // error. Preserve later migration failures instead of rerunning it on a DB
   // where the platform tables already exist.
   const platformTables=run('psql',[url,'-Atqc',"SELECT (to_regclass('public.\"Organization\"') IS NOT NULL)::text"],env).trim();
   if(platformTables==='false')try {
    run('psql',[url,'-v','ON_ERROR_STOP=1','-f','prisma/migrations/202610300002_multi_owner_platform/migration.sql'],env);
   } catch (diagnostic) {
    throw new Error(error.message+'\nMigration SQL diagnostic: '+diagnostic.message);
   }
   throw error;
  }
  const acl=run('psql',[url,'-Atqc',"SELECT has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') || '|' || has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE') || '|' || COALESCE((SELECT bool_or(grantee=0 AND privilege_type='EXECUTE') FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a WHERE p.oid='public.rls_auto_enable()'::regprocedure),false)"],env).trim();
  if(acl!=='false|false|false')throw new Error('The public RLS event-trigger function still has Data API execute grants ('+acl+').');
  run('psql',[url,'-v','ON_ERROR_STOP=1','-c',"DO $$ BEGIN CREATE TABLE public.rls_trigger_probe (id integer); IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.rls_trigger_probe'::regclass) THEN RAISE EXCEPTION 'RLS event trigger did not enable RLS'; END IF; DROP TABLE public.rls_trigger_probe; END $$;"],env);
  const result=spawnSync(process.execPath,['--test','test/integration/platform.test.js'],{cwd:path.join(__dirname,'..'),env,stdio:'inherit'});
  process.exitCode=result.status || 0;
  if(result.status===0){
   const report=JSON.parse(run(process.execPath,['scripts/legacy-adoption-report.js'],env));
   if(report.hitsInTrailing30Days<3||report.retirementGateMet||!report.lastHitsByRoute.categories||!report.lastHitsByRoute.products)throw new Error('Legacy adoption report did not reflect the integration fixture hits.');
  }
 }catch(error){console.error(error.message);process.exitCode=1;}
 finally{if(started)try{run('pg_ctl',['-D',path.join(scratch,'data'),'-m','immediate','-w','stop']);}catch{}rmSync(scratch,{recursive:true,force:true});}
})();
