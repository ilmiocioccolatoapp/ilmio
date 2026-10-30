import {useEffect,useMemo,useState} from 'react';
import {platformService} from '../services/api';

export default function BrandProvisioning({organizations,brands,selectedOrg,onChanged}){
 const [orgId,setOrgId]=useState(selectedOrg?.id||organizations[0]?.id||'');
 const [brandId,setBrandId]=useState('');
 const [brandForm,setBrandForm]=useState({name:'',slug:'',currency:'AED',timezone:'Asia/Dubai'});
 const [ownerName,setOwnerName]=useState('');
 const [invite,setInvite]=useState({email:'',name:''}),[admins,setAdmins]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const availableBrands=useMemo(()=>brands.filter(brand=>!orgId||brand.orgId===orgId),[brands,orgId]);
 const selectedBrand=useMemo(()=>availableBrands.find(brand=>brand.id===brandId)||availableBrands[0],[availableBrands,brandId]);
 useEffect(()=>{if(!availableBrands.some(brand=>brand.id===brandId))setBrandId(availableBrands[0]?.id||'');},[availableBrands,brandId]);
 useEffect(()=>{let active=true;setAdmins([]);if(!selectedBrand)return()=>{active=false;};platformService.get('/brands/'+selectedBrand.id+'/admins').then(data=>{if(active)setAdmins(data);}).catch(error=>{if(active)setMessage(error.error||'Could not load brand administrators.');});return()=>{active=false;};},[selectedBrand]);
 const run=async action=>{if(busy)return;setBusy(true);setMessage('');try{const result=await action();await onChanged();if(result?.membership)setMessage(result.inviteSent?'Invitation email sent. The administrator sets their own password.':'Existing Supabase account received brand administrator access.');else setMessage('Changes saved.');return result;}catch(error){setMessage(error.error||error.message||'Could not complete this action.');}finally{setBusy(false);}};
 const submit=action=>event=>{event.preventDefault();run(action);};
 return <div className="page-container"><h2 className="section-title">Brands & administrators</h2><p>Each brand has its own products, categories, menu settings, and brand administrators. Create each brand under its own owner when the businesses are separate.</p>{message&&<p role="status">{message}</p>}
  <details className="ledger-card management-advanced"><summary>Create owner organization</summary><form onSubmit={submit(async()=>{const owner=await platformService.post('/orgs',{name:ownerName});setOwnerName('');setOrgId(owner.id);return null;})}><div className="form-group"><label>Owner / business name<input required value={ownerName} onChange={event=>setOwnerName(event.target.value)}/></label></div><button className="btn btn-primary" disabled={busy}>Create owner</button></form></details>
  <div className="scope-selectors"><label>Owner organization<select aria-label="Brand owner" value={orgId} onChange={event=>setOrgId(event.target.value)}>{organizations.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}</select></label></div>
  {orgId&&<form className="ledger-card" onSubmit={submit(async()=>{const brand=await platformService.post('/brands',{...brandForm,orgId});setBrandForm({name:'',slug:'',currency:'AED',timezone:'Asia/Dubai'});setBrandId(brand.id);return null;})}><h3>Create brand</h3>
   {[[ 'name','Brand name'],['slug','Brand code'],['timezone','Timezone']].map(([key,label])=><div className="form-group" key={key}><label>{label}<input required value={brandForm[key]} onChange={event=>setBrandForm({...brandForm,[key]:event.target.value})}/></label></div>)}
   <div className="form-group"><label>Currency<select value={brandForm.currency} onChange={event=>setBrandForm({...brandForm,currency:event.target.value})}>{['AED','EUR','USD','GBP'].map(currency=><option key={currency}>{currency}</option>)}</select></label></div><button className="btn btn-primary" disabled={busy}>Create brand</button>
  </form>}
  <div className="ledger-card"><h3>Brand administrators</h3><label>Brand<select aria-label="Administrator brand" value={selectedBrand?.id||''} onChange={event=>setBrandId(event.target.value)}>{availableBrands.map(brand=><option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
   {selectedBrand?<><form onSubmit={submit(async()=>{const result=await platformService.post('/brands/'+selectedBrand.id+'/admins',invite);setInvite({email:'',name:''});await platformService.get('/brands/'+selectedBrand.id+'/admins').then(setAdmins);return result;})}>
    <div className="form-group"><label>Administrator email<input type="email" required value={invite.email} onChange={event=>setInvite({...invite,email:event.target.value})}/></label></div><div className="form-group"><label>Name (optional)<input value={invite.name} onChange={event=>setInvite({...invite,name:event.target.value})}/></label></div><button className="btn btn-primary" disabled={busy}>Invite brand administrator</button>
   </form><h4>Current administrators</h4>{admins.length===0&&<p>No brand administrators yet.</p>}{admins.map(m=><div className="store-record" key={m.id}><strong>{m.profile.name||m.profile.email}</strong><p>{m.profile.email} · {m.profile.status}</p><div className="store-actions"><button className="btn btn-ghost btn-sm" disabled={busy||m.profile.status!=='active'} onClick={()=>run(async()=>{await platformService.post('/brands/'+selectedBrand.id+'/admins/'+m.id+'/resend-invite',{});return null;})}>Resend setup email</button><button className="btn btn-ghost-danger btn-sm" disabled={busy} onClick={()=>{if(window.confirm('Remove '+m.profile.email+' from '+selectedBrand.name+'?'))run(async()=>{await platformService.remove('/brands/'+selectedBrand.id+'/admins/'+m.id);setAdmins(await platformService.get('/brands/'+selectedBrand.id+'/admins'));return null;});}}>Remove access</button></div></div>)}</>:<p>Create a brand in an owner organization to manage its administrators.</p>}
  </div>
 </div>;
}
