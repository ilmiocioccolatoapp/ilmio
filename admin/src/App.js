import {useEffect,useMemo,useRef,useState} from 'react';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import Categories from './components/Categories';
import Settings from './components/Settings';
import Analytics from './components/Analytics';
import Login from './components/Login';
import Management from './components/Management';
import StoreMenu from './components/StoreMenu';
import BrandProvisioning from './components/BrandProvisioning';
import PasswordRecovery from './components/PasswordRecovery';
import {authService,createCatalogServices,platformService} from './services/api';
import {CatalogProvider} from './data/CatalogContext';
import {supabase,supabaseConfigured} from './supabase';
import './styles/App.css';
const emptyServices={productService:{getAllProducts:async()=>({data:[]})},categoryService:{getAllCategories:async()=>[]}};
function App(){
 const [session,setSession]=useState(null),[authLoading,setAuthLoading]=useState(true),[adminUser,setAdminUser]=useState(null),[authorizationError,setAuthorizationError]=useState(''),[passwordRecovery,setPasswordRecovery]=useState(()=>window.location.pathname.replace(/\/+$/,'').endsWith('/set-password'));
 const [activeTab,setActiveTab]=useState('dashboard'),[orgId,setOrgId]=useState(''),[brandId,setBrandId]=useState(''),[storeId,setStoreId]=useState(''),[assignments,setAssignments]=useState([]);
 const [showForm,setShowForm]=useState(false),[editingProduct,setEditingProduct]=useState(null);
 const userId=session?.user?.id,accessToken=session?.access_token;
 const authorized=adminUser && adminUser.id===userId;
 useEffect(()=>{if(!supabase){setAuthLoading(false);return;}const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{if(event==='PASSWORD_RECOVERY'||window.location.pathname.replace(/\/+$/,'').endsWith('/set-password'))setPasswordRecovery(true);if(event==='SIGNED_OUT')setPasswordRecovery(false);setSession(next);setAuthLoading(false);});return ()=>subscription.unsubscribe();},[]);
 useEffect(()=>{
  if(!accessToken){setAdminUser(null);return;}
  let active=true;setAdminUser(old=>old?.id===userId?old:null);setAuthorizationError('');
  authService.getCurrentUser().then(user=>{if(active)setAdminUser(user);}).catch(error=>{if(active){setAdminUser(null);setAuthorizationError(error.error||error.message||'Could not verify access.');}});
  return ()=>{active=false;};
 },[accessToken,userId]);
 useEffect(()=>{setShowForm(false);setEditingProduct(null);setActiveTab('dashboard');setOrgId('');setBrandId('');setStoreId('');},[userId]);
 const organizations=adminUser?.orgs||[];
 const brands=[...(adminUser?.brands||[])].sort((a,b)=>a.createdAt&&b.createdAt?a.createdAt.localeCompare(b.createdAt):0);
 const selectedBrand=brands.find(b=>b.id===brandId)||brands[0];
 const selectedOrg=organizations.find(o=>o.id===orgId)||organizations.find(o=>o.id===selectedBrand?.orgId)||organizations[0];
 const selectedBrandId=selectedBrand?.id;
 const canCatalog=Boolean(adminUser?.isPlatformAdmin||adminUser?.brandMemberships?.some(m=>m.brandId===selectedBrandId&&m.role==='BRAND_ADMIN'));
 const canManage=Boolean(adminUser&&(adminUser.isPlatformAdmin||adminUser.orgMemberships?.some(m=>m.orgId===selectedOrg?.id&&m.role==='ORG_ADMIN')));
 const permissions=JSON.stringify([adminUser?.isPlatformAdmin,adminUser?.orgMemberships,adminUser?.brandMemberships]);
 const scopeKey=[userId,adminUser?.profileId,selectedOrg?.id,selectedBrand?.id,storeId,permissions].join(':');
 const scopeRef=useRef(scopeKey);scopeRef.current=scopeKey;
 useEffect(()=>{setShowForm(false);setEditingProduct(null);},[scopeKey]);
 useEffect(()=>{let current=true;setAssignments([]);if(selectedBrandId&&canCatalog)platformService.get('/brands/'+selectedBrandId+'/stores').then(data=>{if(current)setAssignments(data);}).catch(()=>{});return()=>{current=false;};},[selectedBrandId,canCatalog,accessToken]);
 const services=useMemo(()=>selectedBrandId&&canCatalog?createCatalogServices({id:selectedBrandId}):emptyServices,[selectedBrandId,canCatalog]);
 const reload=async()=>{const expected=userId,expectedScope=scopeKey;const next=await authService.getCurrentUser();if(next.id===expected&&scopeRef.current===expectedScope)setAdminUser(next);};
 const signOut=async()=>{const {error}=await supabase.auth.signOut();if(error)setAuthorizationError(error.message);};
 if(!supabaseConfigured)return <Login configError="Configure Supabase to sign in."/>;
 if(passwordRecovery&&authLoading)return <main className="auth-page"><div role="status">Checking your password link...</div></main>;
 if(passwordRecovery&&session)return <PasswordRecovery onComplete={()=>setPasswordRecovery(false)}/>;
 if(passwordRecovery&&!session)return <Login authError="This password setup link is invalid or expired. Request a new one."/>;
 if(authLoading||(session&&!authorized&&!authorizationError))return <main className="auth-page"><div role="status">Checking your sign-in...</div></main>;
 if(!session)return <Login authError={authorizationError}/>;
 if(!authorized)return <main className="auth-page"><section className="auth-card"><h1>Admin access unavailable</h1><p>{authorizationError}</p><button onClick={signOut}>Sign out</button></section></main>;
 const navigate=tab=>{setActiveTab(tab);setShowForm(false);};
 const add=()=>{setEditingProduct(null);setShowForm(true);};
 const edit=product=>{setEditingProduct(product);setShowForm(true);};
 const close=()=>{if(scopeRef.current===scopeKey){setShowForm(false);setEditingProduct(null);}};
 const visibleTab=canCatalog?activeTab:'management';
 const tabs=[...(canCatalog?[['dashboard','Overview'],['products','Products'],['categories','Categories'],['store-menu','Store menus'],['settings','Settings'],['analytics','Analytics']]:[]),...(canManage?[['management','Stores & owners']]:[]),...(adminUser.isPlatformAdmin?[['brands','Brands']]:[])];
 let content;
 if(!canCatalog&&!canManage)content=<div className="page-container"><h2>Access unavailable</h2><p>Your account has no active workspace permissions.</p></div>;
 else if(visibleTab==='brands')content=adminUser.isPlatformAdmin?<BrandProvisioning organizations={organizations} brands={adminUser.brands||[]} selectedOrg={selectedOrg} onChanged={reload}/>:null;
 else if(visibleTab==='management')content=canManage?<Management key={selectedOrg?.id||'new'} org={selectedOrg} admin={adminUser} onChanged={reload}/>:null;
 else if(!canCatalog)content=canManage?<Management key={selectedOrg?.id||'new'} org={selectedOrg} admin={adminUser} onChanged={reload}/>:null;
 else if(!selectedBrand)content=<div className="page-container"><h2>Create your first brand</h2><p>Set up an owner organization, its brands, and physical stores to begin.</p>{canManage&&<button className="btn btn-primary" onClick={()=>navigate('management')}>Set up stores and owners</button>}</div>;
 else switch(visibleTab){
  case 'products':content=<ProductList onEdit={edit}/>;break;
  case 'categories':content=<Categories/>;break;
  case 'settings':content=<Settings key={selectedBrand.id} brand={selectedBrand} canEditSlug={Boolean(adminUser.isPlatformAdmin)} onSaved={reload}/>;break;
  case 'analytics':content=<Analytics onAddProduct={add} onNavigateProducts={()=>navigate('products')}/>;break;
  case 'store-menu':content=<StoreMenu key={scopeKey} brand={selectedBrand} storeId={storeId} assignments={assignments} onSelectStore={setStoreId}/>;break;
  default:content=<Dashboard onAddProduct={add} onNavigate={navigate}/>;
 }
 return <CatalogProvider key={scopeKey} services={services} brand={selectedBrand}>
  <div className="app"><aside className="sidebar"><div className="sidebar-brand"><span>Menu Platform</span><small>{adminUser.isPlatformAdmin?'Super Admin':'Administration'}</small></div>
   <nav aria-label="Workspace"><ul className="sidebar-menu">{tabs.map(([id,label])=><li key={id}><button className={visibleTab===id?'active':''} onClick={()=>navigate(id)}>{label}</button></li>)}</ul></nav>
  </aside><div className="workspace"><header className="app-header"><div className="header-inner">
   <div className="scope-selectors">
    {visibleTab==='management'&&<label>Owner<select aria-label="Owner organization" value={selectedOrg?.id||''} onChange={e=>{const nextOrgId=e.target.value;setOrgId(nextOrgId);setBrandId(brands.find(b=>b.orgId===nextOrgId)?.id||'');setStoreId('');}}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
    {visibleTab!=='management'&&visibleTab!=='brands'&&selectedBrand&&<label>Brand<select aria-label="Brand" value={selectedBrand.id} onChange={e=>{const nextBrand=brands.find(b=>b.id===e.target.value);setBrandId(e.target.value);setOrgId(nextBrand?.orgId||'');setStoreId('');}}>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
   </div><div className="admin-actions"><span className="admin-user">{adminUser.email}</span><button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button></div>
  </div></header><main className="main-content">{content}</main></div>
  {showForm&&selectedBrand&&<ProductForm key={scopeKey} product={editingProduct} onSuccess={close} onCancel={close}/>}</div>
 </CatalogProvider>;
}
export default App;
